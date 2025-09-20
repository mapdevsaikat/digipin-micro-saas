#!/bin/bash

# Create DigiPin Micro-SaaS directory structure

echo "🏗️  Creating DigiPin Micro-SaaS directory structure..."

# Main directories
mkdir -p src/{routes,models,database,cache,middleware,utils,validation}
mkdir -p data/{backups}
mkdir -p docs
mkdir -p tests/{unit,integration,load}
mkdir -p scripts
mkdir -p config
mkdir -p logs

# Create initial files
touch src/server.ts
touch src/app.ts
touch src/routes/index.ts
touch src/routes/geocoding.ts
touch src/routes/utility.ts
touch src/routes/system.ts

touch src/models/DigiPin.ts
touch src/models/ApiKey.ts
touch src/models/RequestLog.ts

touch src/database/connection.ts
touch src/database/migrations.ts
touch src/database/schema.sql

touch src/cache/CacheManager.ts
touch src/cache/strategies.ts

touch src/middleware/auth.ts
touch src/middleware/rateLimit.ts
touch src/middleware/validation.ts
touch src/middleware/logging.ts

touch src/utils/helpers.ts
touch src/utils/constants.ts
touch src/utils/errors.ts

touch src/validation/schemas.ts

touch tests/setup.ts
touch tests/unit/digipin.test.ts
touch tests/integration/api.test.ts

touch scripts/migrate.ts
touch scripts/seed.ts
touch scripts/deploy.ts

touch config/database.ts
touch config/cache.ts
touch config/server.ts

touch docs/API.md
touch docs/DEPLOYMENT.md
touch docs/CONTRIBUTING.md

echo "✅ Directory structure created successfully!"
echo "📁 Project is ready for development with Cursor AI"
