using AutoMapper;
using SecurityOps.Application.Contracts;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Mapping;

public sealed class SecurityMappingProfile : Profile
{
    public SecurityMappingProfile()
    {
        CreateMap<SecurityStaff, StaffResponse>();
        CreateMap<DutyDesignation, DesignationResponse>();
        CreateMap<SecurityLocation, LocationResponse>();
        CreateMap<SecurityShift, ShiftResponse>();
        CreateMap<SecurityShiftDeployment, DeploymentResponse>();
        CreateMap<PatrolPhoto, PatrolPhotoResponse>();

        // New mappings
        CreateMap<SecurityVendorContract, Features.Contracts.Queries.ContractDto>();
        CreateMap<SecurityRoleRate, Features.Contracts.Queries.RoleRateDto>();
    }
}
