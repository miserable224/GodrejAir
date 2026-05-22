using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Application.Common.Interfaces;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}

public interface IApplicationDbContext : IUnitOfWork
{
    DbSet<SecurityStaff> SecurityStaff { get; }
    DbSet<SecurityLocation> SecurityLocations { get; }
    DbSet<SecurityShift> SecurityShifts { get; }
    DbSet<SecurityShiftDeployment> SecurityShiftDeployments { get; }
    DbSet<PatrolLog> PatrolLogs { get; }
    DbSet<PatrolLogStaff> PatrolLogStaff { get; }
    DbSet<PatrolPhoto> PatrolPhotos { get; }
    DbSet<SecurityDeploymentLog> SecurityDeploymentLogs { get; }
    DbSet<SecurityDeploymentPhoto> SecurityDeploymentPhotos { get; }
    DbSet<SecurityDutySession> SecurityDutySessions { get; }

    DbSet<SecurityVendorContract> SecurityVendorContracts { get; }
    DbSet<SecurityRoleRate> SecurityRoleRates { get; }
    DbSet<SecuritySanctionedStrength> SecuritySanctionedStrengths { get; }
    DbSet<SecurityDailyAttendanceSummary> SecurityDailyAttendanceSummaries { get; }
    DbSet<SecurityMonthlyBilling> SecurityMonthlyBillings { get; }
    DbSet<SecurityMonthlyBillingItem> SecurityMonthlyBillingItems { get; }
    DbSet<SecurityAppUser> SecurityAppUsers { get; }
    DbSet<SecurityRefreshToken> SecurityRefreshTokens { get; }
    DbSet<SecurityEmailOtp> SecurityEmailOtps { get; }

    DbSet<HkVendorContract> HkVendorContracts { get; }
    DbSet<HkContractRate> HkContractRates { get; }
    DbSet<Promotion> Promotions { get; }
    DbSet<PromotionType> PromotionTypes { get; }
    DbSet<PromotionVendor> PromotionVendors { get; }
    DbSet<BoardMember> BoardMembers { get; }
    DbSet<PromotionPayment> PromotionPayments { get; }
    DbSet<PromotionDocument> PromotionDocuments { get; }

    DatabaseFacade Database { get; }
}
