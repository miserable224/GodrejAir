# Build from repository root: Render → Root Directory = . (repo root), Dockerfile = backend/HousekeepingOps/Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/SecurityOps/src/ SecurityOps/
COPY backend/HousekeepingOps/src/ HousekeepingOps/
WORKDIR /src/HousekeepingOps/HousekeepingOps.Api
RUN dotnet restore
RUN dotnet publish HousekeepingOps.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "HousekeepingOps.Api.dll"]
