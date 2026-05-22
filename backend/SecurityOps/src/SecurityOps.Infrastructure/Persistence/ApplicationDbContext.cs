using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain;
using SecurityOps.Domain.Entities;

namespace SecurityOps.Infrastructure.Persistence;

public sealed class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default) =>
        Database.BeginTransactionAsync(cancellationToken);

    public DbSet<SecurityStaff> SecurityStaff => Set<SecurityStaff>();
    public DbSet<SecurityLocation> SecurityLocations => Set<SecurityLocation>();
    public DbSet<SecurityShift> SecurityShifts => Set<SecurityShift>();
    public DbSet<SecurityShiftDeployment> SecurityShiftDeployments => Set<SecurityShiftDeployment>();
    public DbSet<PatrolLog> PatrolLogs => Set<PatrolLog>();
    public DbSet<PatrolLogStaff> PatrolLogStaff => Set<PatrolLogStaff>();
    public DbSet<PatrolPhoto> PatrolPhotos => Set<PatrolPhoto>();
    public DbSet<SecurityDeploymentLog> SecurityDeploymentLogs => Set<SecurityDeploymentLog>();
    public DbSet<SecurityDeploymentPhoto> SecurityDeploymentPhotos => Set<SecurityDeploymentPhoto>();
    public DbSet<SecurityDutySession> SecurityDutySessions => Set<SecurityDutySession>();

    public DbSet<SecurityVendorContract> SecurityVendorContracts => Set<SecurityVendorContract>();
    public DbSet<SecurityRoleRate> SecurityRoleRates => Set<SecurityRoleRate>();
    public DbSet<SecuritySanctionedStrength> SecuritySanctionedStrengths => Set<SecuritySanctionedStrength>();
    public DbSet<SecurityDailyAttendanceSummary> SecurityDailyAttendanceSummaries => Set<SecurityDailyAttendanceSummary>();
    public DbSet<SecurityMonthlyBilling> SecurityMonthlyBillings => Set<SecurityMonthlyBilling>();
    public DbSet<SecurityMonthlyBillingItem> SecurityMonthlyBillingItems => Set<SecurityMonthlyBillingItem>();
    public DbSet<SecurityAppUser> SecurityAppUsers => Set<SecurityAppUser>();
    public DbSet<SecurityRefreshToken> SecurityRefreshTokens => Set<SecurityRefreshToken>();
    public DbSet<SecurityEmailOtp> SecurityEmailOtps => Set<SecurityEmailOtp>();

    public DbSet<HkVendorContract> HkVendorContracts => Set<HkVendorContract>();
    public DbSet<HkContractRate> HkContractRates => Set<HkContractRate>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<PromotionType> PromotionTypes => Set<PromotionType>();
    public DbSet<PromotionVendor> PromotionVendors => Set<PromotionVendor>();
    public DbSet<BoardMember> BoardMembers => Set<BoardMember>();
    public DbSet<PromotionPayment> PromotionPayments => Set<PromotionPayment>();
    public DbSet<PromotionDocument> PromotionDocuments => Set<PromotionDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SecurityStaff>(e =>
        {
            e.ToTable("security_staff");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.BadgeNumber).HasMaxLength(50);
            e.Property(x => x.Role).HasMaxLength(50).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(30);
            e.HasIndex(x => x.Role);
            e.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<SecurityLocation>(e =>
        {
            e.ToTable("security_locations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Code).HasMaxLength(50);
            e.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<SecurityShift>(e =>
        {
            e.ToTable("security_shifts");
            e.HasKey(x => x.Id);
            e.Property(x => x.ShiftType).HasMaxLength(20).IsRequired();
            e.Property(x => x.Status).HasMaxLength(30);
            e.Property(x => x.Notes).HasMaxLength(2000);
            e.HasIndex(x => new { x.ShiftDate, x.ShiftType });
            e.HasIndex(x => x.SupervisorId);
            e.HasOne(x => x.Supervisor)
                .WithMany(x => x.SupervisedShifts)
                .HasForeignKey(x => x.SupervisorId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SecurityShiftDeployment>(e =>
        {
            e.ToTable("security_shift_deployments");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.ShiftId);
            e.HasIndex(x => new { x.ShiftId, x.StaffId });
            e.HasOne(x => x.Shift)
                .WithMany(x => x.Deployments)
                .HasForeignKey(x => x.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Staff)
                .WithMany(x => x.Deployments)
                .HasForeignKey(x => x.StaffId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Location)
                .WithMany(x => x.Deployments)
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PatrolLog>(e =>
        {
            e.ToTable("patrol_logs");
            e.HasKey(x => x.Id);
            e.Property(x => x.PatrolType).HasMaxLength(50).IsRequired();
            e.Property(x => x.Remarks).HasMaxLength(4000);
            e.HasIndex(x => x.ShiftId);
            e.HasIndex(x => x.PatrolTime);
            e.HasOne(x => x.Shift)
                .WithMany(x => x.PatrolLogs)
                .HasForeignKey(x => x.ShiftId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Recorder)
                .WithMany(x => x.RecordedPatrols)
                .HasForeignKey(x => x.RecordedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PatrolLogStaff>(e =>
        {
            e.ToTable("patrol_log_staff");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.PatrolLogId, x.StaffId }).IsUnique();
            e.HasOne(x => x.PatrolLog)
                .WithMany(x => x.Staff)
                .HasForeignKey(x => x.PatrolLogId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Staff)
                .WithMany(x => x.PatrolParticipations)
                .HasForeignKey(x => x.StaffId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PatrolPhoto>(e =>
        {
            e.ToTable("patrol_photos");
            e.HasKey(x => x.Id);
            e.Property(x => x.PhotoUrl).HasMaxLength(2000).IsRequired();
            e.HasIndex(x => x.PatrolLogId);
            e.HasOne(x => x.PatrolLog)
                .WithMany(x => x.Photos)
                .HasForeignKey(x => x.PatrolLogId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SecurityDeploymentLog>(e =>
        {
            e.ToTable("security_deployment_logs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Module).HasMaxLength(32).HasDefaultValue(DeploymentModules.Security);
            e.HasIndex(x => x.Module);
            e.Property(x => x.Designation).HasMaxLength(100);
            e.Property(x => x.StaffName).HasMaxLength(200).IsRequired();
            e.Property(x => x.LocationName).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.LogDate);
            e.HasOne(x => x.Staff)
                .WithMany()
                .HasForeignKey(x => x.StaffId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SecurityDeploymentPhoto>(e =>
        {
            e.ToTable("security_deployment_photos");
            e.HasKey(x => x.Id);
            e.Property(x => x.PhotoUrl).HasMaxLength(2000).IsRequired();
            e.HasIndex(x => x.DeploymentLogId);
            e.HasOne(x => x.DeploymentLog)
                .WithMany(x => x.Photos)
                .HasForeignKey(x => x.DeploymentLogId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SecurityDutySession>(e =>
        {
            e.ToTable("security_duty_sessions");
            e.HasKey(x => x.Id);
            e.Property(x => x.StaffName).HasMaxLength(200).IsRequired();
            e.Property(x => x.LocationName).HasMaxLength(200).IsRequired();
            e.Property(x => x.Designation).HasMaxLength(100);
            e.Property(x => x.Status).HasMaxLength(20).IsRequired();
            e.Property(x => x.EntryPhotoUrl).HasMaxLength(2000);
            e.Property(x => x.ExitPhotoUrl).HasMaxLength(2000);
            e.Property(x => x.EntryShift).HasMaxLength(20);
            e.Property(x => x.ExitShift).HasMaxLength(20);
            e.HasIndex(x => x.Status);
            e.HasIndex(x => x.EntryShift);
            e.HasIndex(x => x.EntryAt);
            e.HasIndex(x => new { x.StaffId, x.Status });
            e.HasOne(x => x.Staff)
                .WithMany()
                .HasForeignKey(x => x.StaffId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SecurityVendorContract>(e =>
        {
            e.ToTable("security_vendor_contracts");
            e.HasKey(x => x.Id);
            e.Property(x => x.VendorName).HasMaxLength(200).IsRequired();
            e.Property(x => x.ContractNumber).HasMaxLength(100).IsRequired();
            e.Property(x => x.StartDate);
            e.Property(x => x.EndDate);
            e.Property(x => x.IsActive);
            e.Property(x => x.ServiceChargePercentage).HasPrecision(18, 2);
            e.Property(x => x.GstPercentage).HasPrecision(18, 2);
            // Not in Supabase until migration 013; entity defaults (5% / 30%) apply in code.
            e.Ignore(x => x.ShortageThresholdPercentage);
            e.Ignore(x => x.HighShortagePenaltyPercentage);
            // Legacy schema: has updated_by but not updated_at (see migration 014).
            e.Ignore(x => x.UpdatedAt);
        });

        modelBuilder.Entity<SecurityRoleRate>(e =>
        {
            e.ToTable("security_role_rates");
            e.HasKey(x => x.Id);
            e.Ignore(x => x.UpdatedAt);
            // Supabase table uses "role", not "role_name".
            e.Property(x => x.RoleName).HasColumnName("role").HasMaxLength(100).IsRequired();
            e.Property(x => x.DailyRate).HasPrecision(18, 2);
            e.Property(x => x.MonthlyRate).HasPrecision(18, 2);
            e.Property(x => x.ShiftDuration).HasMaxLength(50);
            e.HasOne(x => x.Contract).WithMany(x => x.RoleRates).HasForeignKey(x => x.ContractId);
        });

        modelBuilder.Entity<SecuritySanctionedStrength>(e =>
        {
            e.ToTable("security_sanctioned_strength");
            e.HasKey(x => x.Id);
            e.Property(x => x.RoleName).HasColumnName("role").HasMaxLength(100).IsRequired();
            e.Property(x => x.ShiftType).HasColumnName("shift_type").HasMaxLength(50).IsRequired();
            e.Property(x => x.RequiredCount).HasColumnName("required_count");
            e.Ignore(x => x.UpdatedAt);
        });

        modelBuilder.Entity<SecurityDailyAttendanceSummary>(e =>
        {
            e.ToTable("security_daily_attendance_summary");
            e.HasKey(x => x.Id);
            e.Property(x => x.Date).HasColumnName("summary_date");
            e.Property(x => x.RoleName).HasColumnName("role").HasMaxLength(100).IsRequired();
            e.Property(x => x.ShiftName).HasColumnName("shift_type").HasMaxLength(50).IsRequired();
            e.Property(x => x.RequiredCount).HasColumnName("required_count");
            e.Property(x => x.DeployedCount).HasColumnName("deployed_count");
            e.Property(x => x.ShortageCount).HasColumnName("shortage_count");
            e.Property(x => x.DailyRate).HasColumnName("daily_rate").HasPrecision(18, 2);
            e.Property(x => x.ShortagePenalty).HasColumnName("shortage_penalty").HasPrecision(18, 2);
            e.HasIndex(x => new { x.Date, x.RoleName, x.ShiftName }).IsUnique();
            e.Ignore(x => x.UpdatedAt);
        });

        modelBuilder.Entity<SecurityMonthlyBilling>(e =>
        {
            e.ToTable("security_monthly_billing");
            e.HasKey(x => x.Id);
            e.Property(x => x.BillingMonth).HasMaxLength(10).IsRequired();
            e.Property(x => x.InvoiceNumber).HasMaxLength(50);
            e.Property(x => x.GrossServiceAmount).HasPrecision(18, 2);
            e.Property(x => x.TotalShortageDeduction).HasPrecision(18, 2);
            e.Property(x => x.HighShortagePenalty).HasPrecision(18, 2);
            e.Property(x => x.NetBeforeTax).HasPrecision(18, 2);
            e.Property(x => x.ServiceChargeAmount).HasPrecision(18, 2);
            e.Property(x => x.GstAmount).HasPrecision(18, 2);
            e.Property(x => x.GrandTotal).HasPrecision(18, 2);
            e.HasOne(x => x.Contract).WithMany().HasForeignKey(x => x.ContractId);
            e.HasIndex(x => new { x.ContractId, x.BillingMonth }).IsUnique();
        });

        modelBuilder.Entity<SecurityMonthlyBillingItem>(e =>
        {
            e.ToTable("security_monthly_billing_items");
            e.HasKey(x => x.Id);
            e.Property(x => x.RoleName).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(500).IsRequired();
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.Billing).WithMany(x => x.Items).HasForeignKey(x => x.BillingId);
        });

        modelBuilder.Entity<SecurityAppUser>(e =>
        {
            e.ToTable("security_app_users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Username).HasMaxLength(100).IsRequired();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.PasswordHash).HasMaxLength(200).IsRequired();
            e.Property(x => x.Role).HasMaxLength(30).IsRequired();
            e.Property(x => x.DisplayName).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Username).IsUnique();
            e.HasIndex(x => x.Email);
        });

        modelBuilder.Entity<SecurityEmailOtp>(e =>
        {
            e.ToTable("security_email_otps");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(256).IsRequired();
            e.Property(x => x.OtpHash).HasMaxLength(128).IsRequired();
            e.Property(x => x.Purpose).HasMaxLength(40).IsRequired();
            e.HasIndex(x => x.Email);
        });

        modelBuilder.Entity<SecurityRefreshToken>(e =>
        {
            e.ToTable("security_refresh_tokens");
            e.HasKey(x => x.Id);
            e.Property(x => x.TokenHash).HasMaxLength(128).IsRequired();
            e.HasIndex(x => x.TokenHash);
            e.HasOne(x => x.User).WithMany(x => x.RefreshTokens).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<HkVendorContract>(e =>
        {
            e.ToTable("hk_vendor_contracts");
            e.HasKey(x => x.Id);
            e.Property(x => x.VendorName).HasMaxLength(200).IsRequired();
            e.Property(x => x.ContractNumber).HasMaxLength(80).IsRequired();
            e.Property(x => x.ServiceChargePercentage).HasPrecision(6, 2);
            e.Property(x => x.GstPercentage).HasPrecision(6, 2);
            e.HasIndex(x => x.IsActive);
        });

        modelBuilder.Entity<HkContractRate>(e =>
        {
            e.ToTable("hk_contract_rates");
            e.HasKey(x => x.Id);
            e.Property(x => x.RoleCode).HasMaxLength(50).IsRequired();
            e.Property(x => x.RoleName).HasMaxLength(120).IsRequired();
            e.Property(x => x.MonthlyRate).HasPrecision(12, 2);
            e.Property(x => x.Shift1Sanctioned).HasColumnName("shift1_sanctioned");
            e.Property(x => x.Shift2Sanctioned).HasColumnName("shift2_sanctioned");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.HasIndex(x => new { x.ContractId, x.RoleCode }).IsUnique();
            e.HasOne(x => x.Contract).WithMany(x => x.RoleRates).HasForeignKey(x => x.ContractId);
        });

        modelBuilder.Entity<PromotionType>(e =>
        {
            e.ToTable("promotion_types");
            e.HasKey(x => x.Id);
            e.Property(x => x.TypeName).HasMaxLength(120).IsRequired();
            e.HasIndex(x => x.TypeName).IsUnique();
        });

        modelBuilder.Entity<PromotionVendor>(e =>
        {
            e.ToTable("vendors");
            e.HasKey(x => x.Id);
            e.Property(x => x.VendorName).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.VendorName);
        });

        modelBuilder.Entity<BoardMember>(e =>
        {
            e.ToTable("board_members");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Promotion>(e =>
        {
            e.ToTable("promotions");
            e.HasKey(x => x.Id);
            e.Property(x => x.PromotionTitle).HasMaxLength(200);
            e.Property(x => x.UnitPrice).HasPrecision(12, 2);
            e.Property(x => x.SubtotalAmount).HasPrecision(12, 2);
            e.Property(x => x.GstPercentage).HasPrecision(5, 2);
            e.Property(x => x.GstAmount).HasPrecision(12, 2);
            e.Property(x => x.TotalAmount).HasPrecision(12, 2);
            e.Property(x => x.PaymentStatus).HasMaxLength(20);
            e.Property(x => x.PromotionStatus).HasMaxLength(20);
            e.HasOne(x => x.PromotionType).WithMany().HasForeignKey(x => x.PromotionTypeId);
            e.HasOne(x => x.Vendor).WithMany().HasForeignKey(x => x.VendorId);
            e.HasOne(x => x.BoardMember).WithMany().HasForeignKey(x => x.BoardMemberId);
            e.HasIndex(x => x.VendorId);
            e.HasIndex(x => new { x.StartDate, x.EndDate });
            e.HasIndex(x => x.PromotionStatus);
        });

        modelBuilder.Entity<PromotionPayment>(e =>
        {
            e.ToTable("promotion_payments");
            e.HasKey(x => x.Id);
            e.Property(x => x.Amount).HasPrecision(12, 2);
            e.Property(x => x.PaymentMode).HasMaxLength(50);
            e.Property(x => x.PaymentReferenceNumber).HasMaxLength(120);
            e.HasOne(x => x.Promotion).WithMany().HasForeignKey(x => x.PromotionId);
            e.HasIndex(x => x.PromotionId);
            e.HasIndex(x => x.PaymentDate);
        });

        modelBuilder.Entity<PromotionDocument>(e =>
        {
            e.ToTable("promotion_documents");
            e.HasKey(x => x.Id);
            e.Property(x => x.FileUrl).HasMaxLength(500).IsRequired();
            e.Property(x => x.FileName).HasMaxLength(255);
            e.Property(x => x.DocumentType).HasMaxLength(80);
            e.HasOne(x => x.Promotion).WithMany().HasForeignKey(x => x.PromotionId);
        });

        // Many Supabase schemas have created_at / updated_at but not user FK columns. AuditableEntity
        // includes CreatedBy / UpdatedBy — omit them from the model so SQL does not reference missing columns.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (entityType.IsOwned() || entityType.ClrType is null)
                continue;
            var clr = entityType.ClrType;
            if (clr.IsAbstract || !typeof(AuditableEntity).IsAssignableFrom(clr))
                continue;
            modelBuilder.Entity(clr).Ignore(nameof(AuditableEntity.CreatedBy));
            modelBuilder.Entity(clr).Ignore(nameof(AuditableEntity.UpdatedBy));
        }
    }
}
