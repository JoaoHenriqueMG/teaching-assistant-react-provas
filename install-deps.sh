#!/bin/bash
# Installs the dependencies of the client and of the server.
# Equivalent to running "npm install" at the root of the project, which npm
# workspaces expand to both packages.

set -e

echo "Installing the Teaching Assistant dependencies..."
npm install

echo ""
echo "Done. To start the application, run:"
echo "  npm run dev"
echo ""
echo "Client: http://localhost:3004"
echo "Server: http://localhost:3005"
