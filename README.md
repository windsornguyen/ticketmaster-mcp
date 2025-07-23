# Ticketmaster Discovery MCP Server

A Model Context Protocol server that provides tools for discovering events, venues, and attractions through the Ticketmaster Discovery API.

*This implementation has been adapted from [delorenj/mcp-server-ticketmaster](https://github.com/delorenj/mcp-server-ticketmaster) with enhanced HTTP transport support.*

## Features

- **Comprehensive Search**: Find events, venues, and attractions with flexible filtering
  - Keyword search across all content types
  - Date range filtering for events
  - Location-based search (city, state, country)
  - Venue-specific and attraction-specific searches
  - Event classification/category filtering
- **Multiple Output Formats**:
  - Structured JSON data for programmatic use
  - Human-readable text for direct consumption
- **Rich Data**: Complete information including names, dates, prices, URLs, images, locations, and classifications
- **HTTP-First Design**: Built for modern web integration with streamable HTTP transport

## Installation & Setup

### Prerequisites

You'll need a Ticketmaster API key:
1. Visit [developer.ticketmaster.com](https://developer.ticketmaster.com/)
2. Create an account and sign in
3. Navigate to "My Apps" and create a new application
4. Copy your Consumer Key (this is your API key)

### Installation Options

#### Option 1: Direct Installation (Recommended)

```bash
# Clone and build locally
git clone https://github.com/your-org/ticketmaster-mcp.git
cd ticketmaster-mcp
npm install
npm run build
```

#### Option 2: NPM Package Installation

*Note: Package publishing to NPM pending*

```bash
npm install -g @your-org/mcp-server-ticketmaster-discovery
```

## Configuration

### For Streamable HTTP Transport (Recommended)

Create a `.env` file in your project directory:

```bash
TICKETMASTER_API_KEY=your-consumer-key-here
```

Start the HTTP server:

```bash
# Start on default port 3002
node build/index.js --port 3002

# Or specify a custom port
node build/index.js --port 8080
```

The server will display connection information:

```
Ticketmaster MCP Server listening on http://localhost:3002
Put this in your client config:
{
  "mcpServers": {
    "ticketmaster": {
      "url": "http://localhost:3002/sse"
    }
  }
}
If your client supports streamable HTTP, you can use the /mcp endpoint instead.
```

### For MCP Clients Supporting HTTP

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "ticketmaster": {
      "url": "http://localhost:3002/mcp"
    }
  }
}
```

### For STDIO Transport (Legacy)

If your client only supports STDIO transport, you can configure:

```json
{
  "mcpServers": {
    "ticketmaster": {
      "command": "node",
      "args": ["path/to/ticketmaster-mcp/build/index.js"],
      "env": {
        "TICKETMASTER_API_KEY": "your-consumer-key-here"
      }
    }
  }
}
```

## API Reference

### Available Tools

#### `search_ticketmaster`

Search for events, venues, or attractions on Ticketmaster.

**Required Parameters:**
- `type` (string): Type of search - `"event"`, `"venue"`, or `"attraction"`

**Optional Parameters:**
- `keyword` (string): Search term or phrase
- `startDate` (string): Start date in YYYY-MM-DD format (events only)
- `endDate` (string): End date in YYYY-MM-DD format (events only)
- `city` (string): City name for location-based search
- `stateCode` (string): State code (e.g., "NY", "CA")
- `countryCode` (string): Country code (e.g., "US", "CA")
- `venueId` (string): Specific Ticketmaster venue ID
- `attractionId` (string): Specific Ticketmaster attraction ID
- `classificationName` (string): Event category (e.g., "Sports", "Music", "Theater")
- `format` (string): Output format - `"json"` (default) or `"text"`

## Usage Examples

### MCP Client Integration

```javascript
// Search for upcoming concerts in New York
{
  "tool": "search_ticketmaster",
  "arguments": {
    "type": "event",
    "keyword": "concert",
    "city": "New York",
    "stateCode": "NY",
    "startDate": "2025-01-01",
    "classificationName": "Music",
    "format": "text"
  }
}
```

### HTTP API Testing

```bash
# Initialize session
SESSION_ID=$(curl -s -D - http://localhost:3002/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": { "tools": {} },
      "clientInfo": { "name": "TestClient", "version": "1.0.0" }
    }
  }' | grep -i mcp-session-id | cut -d' ' -f2 | tr -d '\r')

# Send initialized notification
curl http://localhost:3002/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{"jsonrpc": "2.0", "method": "notifications/initialized"}'

# Search for events
curl http://localhost:3002/mcp \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_ticketmaster",
      "arguments": {
        "type": "event",
        "city": "San Francisco",
        "format": "text"
      }
    }
  }'
```

## Development

### Local Development

```bash
# Clone repository
git clone <repository-url>
cd ticketmaster-mcp

# Set up environment
cp .env.example .env
# Edit .env with your Ticketmaster API key

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Run with TypeScript watch mode
npm run watch
```

### Transport Architecture

This server supports multiple transport mechanisms:

- **Streamable HTTP** (`/mcp` endpoint): Modern, session-based transport with concurrent client support
- **Server-Sent Events** (`/sse` endpoint): HTTP-compatible transport for basic MCP clients  
- **STDIO**: Traditional transport for command-line integration

The HTTP transports provide better scalability and integration options for web-based applications.

### Testing

```bash
# Test with MCP Inspector
npm run inspector

# Manual HTTP testing
node build/index.js --port 3002
# Then use curl commands from examples above
```

## Rate Limits & API Considerations

The Ticketmaster Discovery API has rate limits:
- **Sandbox Tier**: 5 requests/second, 5,000 calls/day
- **Deep Paging**: Limited to 1,000 items

For higher quotas or commercial usage, contact the Ticketmaster developer relations team through their portal.

## Contributing

Contributions are welcome! This project builds upon the excellent foundation from [delorenj/mcp-server-ticketmaster](https://github.com/delorenj/mcp-server-ticketmaster).

### Development Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- TypeScript compilation passes (`npm run build`)
- Code follows existing patterns
- HTTP transport functionality is preserved

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

This implementation is adapted from [delorenj/mcp-server-ticketmaster](https://github.com/delorenj/mcp-server-ticketmaster) by Jarad DeLorenzo, with enhancements for streamable HTTP transport.
