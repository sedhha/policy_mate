FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /app

# All environment variables in one layer
ENV UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_NO_PROGRESS=1 \
    PYTHONUNBUFFERED=1 \
    DOCKER_CONTAINER=1 \
    AWS_REGION=us-east-1 \
    AWS_DEFAULT_REGION=us-east-1 \
    BEDROCK_AGENTCORE_MEMORY_ID=policyMateV2_mem-oEv5a6FyoF \
    BEDROCK_AGENTCORE_MEMORY_NAME=policyMateV2_mem



COPY . .

# Copy environment variables from .env file
COPY .env.container /app/.env
# Install from pyproject.toml directory
RUN cd . && uv pip install .




RUN uv pip install aws-opentelemetry-distro>=0.10.1


# Signal that this is running in Docker for host binding logic
ENV DOCKER_CONTAINER=1

# Create non-root user
RUN useradd -m -u 1000 bedrock_agentcore
USER bedrock_agentcore

EXPOSE 9000
EXPOSE 8000
EXPOSE 8080

# Copy entire project (respecting .dockerignore)
COPY . .

# Copy environment variables from .env file
COPY .env.container /app/.env

# Create entrypoint script to load .env if it exists
RUN echo '#!/bin/bash' > /app/entrypoint.sh && \
    echo 'set -a' >> /app/entrypoint.sh && \
    echo '[ -f /app/.env ] && source /app/.env' >> /app/entrypoint.sh && \
    echo 'set +a' >> /app/entrypoint.sh && \
    echo 'exec opentelemetry-instrument python -m agent' >> /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

# Use the entrypoint script
CMD ["/app/entrypoint.sh"]
