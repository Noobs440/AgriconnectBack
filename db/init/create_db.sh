#!/bin/bash
set -e

# This script runs inside the official Postgres image on initialization
# It will create the database specified by $POSTGRES_DB if it doesn't exist.

if [ -z "$(psql -U "$POSTGRES_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'")" ]; then
  echo "Creating database ${POSTGRES_DB}..."
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -c "CREATE DATABASE \"${POSTGRES_DB}\";"
else
  echo "Database ${POSTGRES_DB} already exists."
fi
