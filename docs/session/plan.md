# Plan

## Publish Package

1.  **Configure npm:** Ensure the `package.json` is correctly configured for publishing under the `@delorenj` namespace. This includes setting the package name to `@delorenj/mcp-server-ticketmaster`.
2.  **Authentication:** Ensure I'm logged into the npm registry with the correct credentials to publish under the `@delorenj` namespace.
3.  **Build:** Build the package using `npm run build`.
4.  **Publish:** Publish the package using `npm publish`.
5.  **Test:** Verify the package can be installed using `npx -y install @delorenj/mcp-server-ticketmaster`.
6.  **Make package public:** Update `package.json` to set `private` to `false`.
