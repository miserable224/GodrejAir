# Build from repository root: Render → Root Directory = . (repo root), Dockerfile = backend/HousekeepingOps/Dockerfile
# Layout must match csproj refs: ../../../SecurityOps/src/... from HousekeepingOps/src/HousekeepingOps.Api
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/SecurityOps/ SecurityOps/
COPY backend/HousekeepingOps/ HousekeepingOps/
WORKDIR /src/HousekeepingOps/src/HousekeepingOps.Api
RUN dotnet restore HousekeepingOps.Api.csproj
RUN dotnet publish HousekeepingOps.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "HousekeepingOps.Api.dll"]
