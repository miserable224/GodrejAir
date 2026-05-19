# Render may still point here — builds the unified Godrej API (same as SecurityOps/Dockerfile).
# Preferred setting: Dockerfile Path = backend/SecurityOps/Dockerfile
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
ENV DOTNET_USE_POLLING_FILE_WATCHER=true
ENTRYPOINT ["dotnet", "SecurityOps.Api.dll"]
