# Build from repository root (Render: Root Directory empty, Dockerfile Path = backend/SecurityOps/Dockerfile)
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
ENTRYPOINT ["dotnet", "SecurityOps.Api.dll"]
