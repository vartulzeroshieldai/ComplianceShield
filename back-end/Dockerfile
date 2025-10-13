# Use Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        gettext \
        git \
        wget \
        && rm -rf /var/lib/apt/lists/*

# Install GitLeaks
RUN wget https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_8.28.0_linux_x64.tar.gz \
    && tar -xzf gitleaks_8.28.0_linux_x64.tar.gz \
    && mv gitleaks /usr/local/bin/ \
    && chmod +x /usr/local/bin/gitleaks \
    && rm gitleaks_8.28.0_linux_x64.tar.gz

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Create directories for media and static files
RUN mkdir -p /app/media /app/static

# Skip collectstatic for now - will be handled at runtime
# RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Copy and setup entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Use entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
