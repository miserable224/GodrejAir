# Unified API (auth + security + housekeeping). Render: Dockerfile = backend/SecurityOps/Dockerfile, context = .
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/SecurityOps/src/ ./SecurityOps/src/
WORKDIR /src/SecurityOps/src/SecurityOps.Api
RUN dotnet restore SecurityOps.Api.csproj
RUN dotnet publish SecurityOps.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
# Render/containers: avoid inotify limit crash on appsettings file watchers
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENTRYPOINT ["dotnet", "SecurityOps.Api.dll"]
