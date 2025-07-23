import { config } from 'dotenv';

config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { TicketmasterClient } from './TicketmasterClient.js';
import { SearchType } from './types.js';
import { formatResults } from './formatters.js';

const API_KEY = process.env.TICKETMASTER_API_KEY;
if (!API_KEY) {
    throw new Error('TICKETMASTER_API_KEY environment variable is required');
}

const client = new TicketmasterClient(API_KEY);

class TicketmasterServer {
    private server: Server;
    private client: TicketmasterClient;

    constructor() {
        this.client = client;
        this.server = new Server(
            {
                name: 'ticketmaster',
                version: '0.2.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
        
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    private setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'search_ticketmaster',
                    description: 'Search for events, venues, or attractions on Ticketmaster',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['event', 'venue', 'attraction'],
                                description: 'Type of search to perform'
                            },
                            keyword: {
                                type: 'string',
                                description: 'Search keyword or term'
                            },
                            startDate: {
                                type: 'string',
                                description: 'Start date in YYYY-MM-DD format'
                            },
                            endDate: {
                                type: 'string',
                                description: 'End date in YYYY-MM-DD format'
                            },
                            city: {
                                type: 'string',
                                description: 'City name'
                            },
                            stateCode: {
                                type: 'string',
                                description: 'State code (e.g., NY, CA)'
                            },
                            countryCode: {
                                type: 'string',
                                description: 'Country code (e.g., US, CA)'
                            },
                            venueId: {
                                type: 'string',
                                description: 'Specific venue ID to search'
                            },
                            attractionId: {
                                type: 'string',
                                description: 'Specific attraction ID to search'
                            },
                            classificationName: {
                                type: 'string',
                                description: 'Event classification/category (e.g., "Sports", "Music")'
                            },
                            format: {
                                type: 'string',
                                enum: ['json', 'text'],
                                description: 'Output format (defaults to json)',
                                default: 'json'
                            }
                        },
                        required: ['type'],
                    },
                },
            ],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name !== 'search_ticketmaster') {
                throw new McpError(
                    ErrorCode.MethodNotFound,
                    `Unknown tool: ${request.params.name}`
                );
            }

            const {
                type,
                format = 'json',
                keyword,
                startDate,
                endDate,
                ...otherParams
            } = request.params.arguments as {
                type: SearchType;
                format?: 'json' | 'text';
                keyword?: string;
                startDate?: string;
                endDate?: string;
                city?: string;
                stateCode?: string;
                countryCode?: string;
                venueId?: string;
                attractionId?: string;
                classificationName?: string;
            };

            try {
                const query = {
                    keyword,
                    startDateTime: startDate ? new Date(startDate) : undefined,
                    endDateTime: endDate ? new Date(endDate) : undefined,
                    ...otherParams
                };

                let results;
                switch (type) {
                    case 'event':
                        results = await this.client.searchEvents(query);
                        break;
                    case 'venue':
                        results = await this.client.searchVenues(query);
                        break;
                    case 'attraction':
                        results = await this.client.searchAttractions(query);
                        break;
                    default:
                        throw new McpError(
                            ErrorCode.InvalidParams,
                            `Invalid search type: ${type}`
                        );
                }

                const content = format === 'json' 
                    ? JSON.stringify(results, null, 2)
                    : formatResults(type, results, format !== 'text');

                return {
                    content: [
                        {
                            type: 'text',
                            text: content,
                        },
                    ],
                };
            } catch (error) {
                if (error instanceof Error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: ${error.message}`,
                            },
                        ],
                        isError: true,
                    };
                }
                throw error;
            }
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Ticketmaster MCP server running on stdio');
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options: { port?: number; headless?: boolean } = {};
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--port' && i + 1 < args.length) {
            options.port = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--headless') {
            options.headless = true;
        }
    }
    
    return options;
}

// Session storage for streamable HTTP
const streamableSessions = new Map<string, {transport: any, server: any}>();

// Create a new server instance
function createTicketmasterServerInstance() {
    const serverInstance = new Server(
        {
            name: "ticketmaster-discovery",
            version: "0.2.5",
        },
        {
            capabilities: {
                tools: {},
            },
        },
    );

    const tmServer = new TicketmasterServer();
    // Copy the tool handlers from the TicketmasterServer instance
    serverInstance.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: 'search_ticketmaster',
                description: 'Search for events, venues, or attractions on Ticketmaster',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['event', 'venue', 'attraction'],
                            description: 'Type of search to perform'
                        },
                        keyword: {
                            type: 'string',
                            description: 'Search keyword or term'
                        },
                        startDate: {
                            type: 'string',
                            description: 'Start date in YYYY-MM-DD format'
                        },
                        endDate: {
                            type: 'string',
                            description: 'End date in YYYY-MM-DD format'
                        },
                        city: {
                            type: 'string',
                            description: 'City name'
                        },
                        stateCode: {
                            type: 'string',
                            description: 'State code (e.g., NY, CA)'
                        },
                        countryCode: {
                            type: 'string',
                            description: 'Country code (e.g., US, CA)'
                        },
                        venueId: {
                            type: 'string',
                            description: 'Specific venue ID to search'
                        },
                        attractionId: {
                            type: 'string',
                            description: 'Specific attraction ID to search'
                        },
                        classificationName: {
                            type: 'string',
                            description: 'Event classification/category (e.g., "Sports", "Music")'
                        },
                        format: {
                            type: 'string',
                            enum: ['json', 'text'],
                            description: 'Output format (defaults to json)',
                            default: 'json'
                        }
                    },
                    required: ['type'],
                },
            },
        ],
    }));

    serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name !== 'search_ticketmaster') {
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
            );
        }

        const {
            type,
            format = 'json',
            keyword,
            startDate,
            endDate,
            ...otherParams
        } = request.params.arguments as {
            type: SearchType;
            format?: 'json' | 'text';
            keyword?: string;
            startDate?: string;
            endDate?: string;
            city?: string;
            stateCode?: string;
            countryCode?: string;
            venueId?: string;
            attractionId?: string;
            classificationName?: string;
        };

        try {
            const query = {
                keyword,
                startDateTime: startDate ? new Date(startDate) : undefined,
                endDateTime: endDate ? new Date(endDate) : undefined,
                ...otherParams
            };

            let results;
            switch (type) {
                case 'event':
                    results = await client.searchEvents(query);
                    break;
                case 'venue':
                    results = await client.searchVenues(query);
                    break;
                case 'attraction':
                    results = await client.searchAttractions(query);
                    break;
                default:
                    throw new McpError(
                        ErrorCode.InvalidParams,
                        `Invalid search type: ${type}`
                    );
            }

            const content = format === 'json' 
                ? JSON.stringify(results, null, 2)
                : formatResults(type, results, format !== 'text');

            return {
                content: [
                    {
                        type: 'text',
                        text: content,
                    },
                ],
            };
        } catch (error) {
            if (error instanceof Error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
            throw error;
        }
    });

    return serverInstance;
}

// HTTP server setup
function startHttpServer(port: number) {
    const httpServer = createServer();
    
    httpServer.on('request', async (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        
        if (url.pathname === '/sse') {
            await handleSSE(req, res);
        } else if (url.pathname === '/mcp') {
            await handleStreamable(req, res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });
    
    httpServer.listen(port, () => {
        console.log(`Ticketmaster MCP Server listening on http://localhost:${port}`);
        console.log('Put this in your client config:');
        console.log(JSON.stringify({
            "mcpServers": {
                "ticketmaster": {
                    "url": `http://localhost:${port}/sse`
                }
            }
        }, null, 2));
        console.log('If your client supports streamable HTTP, you can use the /mcp endpoint instead.');
    });
    
    return httpServer;
}

// SSE transport handler
async function handleSSE(req: any, res: any) {
    const serverInstance = createTicketmasterServerInstance();
    const transport = new SSEServerTransport('/sse', res);
    try {
        await serverInstance.connect(transport);
    } catch (error) {
        console.error('SSE connection error:', error);
    }
}

// Streamable HTTP transport handler
async function handleStreamable(req: any, res: any) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (sessionId) {
        // Use existing session
        const session = streamableSessions.get(sessionId);
        if (!session) {
            res.statusCode = 404;
            res.end('Session not found');
            return;
        }
        return await session.transport.handleRequest(req, res);
    }
    
    // Create new session for initialization
    if (req.method === 'POST') {
        const serverInstance = createTicketmasterServerInstance();
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
                streamableSessions.set(sessionId, { transport, server: serverInstance });
                console.log('New Ticketmaster session created:', sessionId);
            }
        });
        
        transport.onclose = () => {
            if (transport.sessionId) {
                streamableSessions.delete(transport.sessionId);
                console.log('Ticketmaster session closed:', transport.sessionId);
            }
        };
        
        try {
            await serverInstance.connect(transport);
            await transport.handleRequest(req, res);
        } catch (error) {
            console.error('Streamable HTTP connection error:', error);
        }
        return;
    }
    
    res.statusCode = 400;
    res.end('Invalid request');
}

// Main server function
async function runServer() {
    const options = parseArgs();
    
    if (options.port) {
        // HTTP mode
        startHttpServer(options.port);
    } else {
        // STDIO mode (default)
        const server = new TicketmasterServer();
        await server.run();
    }
}

runServer().catch((error) => {
    console.error("Fatal error running Ticketmaster server:", error);
    process.exit(1);
});
