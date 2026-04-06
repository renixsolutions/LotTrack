#!/usr/bin/env opt/render/bin/sh
# Exit on error
set -e

# Install dependencies
npm install

# Run database migrations
npx knex migrate:latest

# (Optional) Seed the database - Only do this for the first deploy or if needed
# npx knex seed:run
