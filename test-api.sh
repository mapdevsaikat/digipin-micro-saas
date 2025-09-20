#!/bin/bash

echo "🚀 Testing DigiPin Micro-SaaS API"
echo "=================================="

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:3000/health | jq '.' || echo "Health check failed"

echo -e "\n2. Testing root endpoint..."
curl -s http://localhost:3000/ | jq '.' || echo "Root endpoint failed"

echo -e "\n3. Testing geocoding endpoint..."
curl -s -X POST http://localhost:3000/v1/geocode \
  -H "Content-Type: application/json" \
  -H "x-api-key: free_test_key_hash_12345" \
  -d '{"address": "123 Main Street, New Delhi, Delhi, 110001, India"}' | jq '.' || echo "Geocoding test failed"

echo -e "\n4. Testing usage endpoint..."
curl -s -X GET http://localhost:3000/v1/usage \
  -H "x-api-key: free_test_key_hash_12345" | jq '.' || echo "Usage test failed"

echo -e "\n5. Testing validation endpoint..."
curl -s -X GET http://localhost:3000/v1/validate/TEST123 \
  -H "x-api-key: free_test_key_hash_12345" | jq '.' || echo "Validation test failed"

echo -e "\n✅ API tests completed!"
