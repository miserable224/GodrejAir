using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage;
using SecurityOps.Application.Common.Interfaces;
using SecurityOps.Domain;
using SecurityOps.Domain.Entities;
using SecurityOps.Domain.Entities.Community;
using SecurityOps.Domain.Entities.Water;

namespace SecurityOps.Infrastructure.Persistence;

public sealed class ApplicationDbContext : DbContext, IApplicationDbContext
{
    /// <summary>Shadow column when legacy DB has both name and full_name NOT NULL.</summary>
    internal const string SecurityStaffFullNameColumn = SecurityStaffColumns.FullNameLegacyShadow;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SyncSecurityStaffLegacyNameColumns();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void SyncSecurityStaffLegacyNameColumns()
    {
        foreach (var entry in ChangeTracker.Entries<SecurityStaff>())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified))
                continue;

            var displayName = entry.Entity.Name?.Trim();
            if (string.IsNullOrEmpty(displayName))
                continue;

            entry.Property(SecurityStaffFullNameColumn).CurrentValue = displayName;
        }
    }

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default) =>
        Database.BeginTransactionAsync(cancellationToken);

    public DbSet<SecurityStaff> SecurityStaff => Set<SecurityStaff>();
    public DbSet<DutyDesignation> DutyDesignations => Set<DutyDesignation>();
    public DbSet<SecurityLocation> SecurityLocations => Set<SecurityLocation>();
    public DbSet<SecurityShift> SecurityShifts => Set<SecurityShift>();
    public DbSet<SecurityShiftDeployment> SecurityShiftDeployments => Set<SecurityShiftDeployment>();
    public DbSet<PatrolLog> PatrolLogs => Set<PatrolLog>();
    public DbSet<PatrolLogStaff> PatrolLogStaff => Set<PatrolLogStaff>();
    public DbSet<PatrolPhoto> PatrolPhotos => Set<PatrolPhoto>();
    public DbSet<SecurityDeploymentLog> SecurityDeploymentLogs => Set<SecurityDeploymentLog>();
    public DbSet<SecurityDeploymentPhoto> SecurityDeploymentPhotos => Set<SecurityDeploymentPhoto>();
    public DbSet<SecurityDutySession> SecurityDutySessions => Set<SecurityDutySession>();
    public DbSet<HousekeepingDutySession> HousekeepingDutySessions => Set<HousekeepingDutySession>();

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

    public DbSet<EventItem> Events => Set<EventItem>();
    public DbSet<ClassDef> Classes => Set<ClassDef>();
    public DbSet<ClassSchedule> ClassSchedules => Set<ClassSchedule>();
    public DbSet<SocietyVendor> SocietyVendors => Set<SocietyVendor>();

    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<ResidentFact> ResidentFacts => Set<ResidentFact>();
    public DbSet<SocietyDoc> SocietyDocs => Set<SocietyDoc>();

    public DbSet<WaterVendor> WaterVendors => Set<WaterVendor>();
    public DbSet<WaterVendorVehicle> WaterVendorVehicles => Set<WaterVendorVehicle>();
    public DbSet<WaterRecord> WaterRecords => Set<WaterRecord>();
    public DbSet<WaterRecordPhoto> WaterRecordPhotos => Set<WaterRecordPhoto>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DutyDesignation>(e =>
        {
            e.ToTable("duty_designations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Module).HasMaxLength(32).IsRequired();
            e.Property(x => x.Title).HasMaxLength(120).IsRequired();
            e.HasIndex(x => new { x.Module, x.IsActive });
        });

        modelBuilder.Entity<SecurityStaff>(e =>
        {
            e.ToTable("security_staff");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            // Legacy Supabase rows may require both name and full_name; synced in SaveChangesAsync.
            e.Property<string>(SecurityStaffFullNameColumn)
                .HasColumnName("full_name")
                .HasMaxLength(200);
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

        modelBuilder.Entity<HousekeepingDutySession>(e =>
        {
            e.ToTable("housekeeping_duty_sessions");
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
            e.HasIndex(x => new { x.StaffName, x.Status });
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
            e.Property(x => x.HeadcountSanctioned).HasColumnName("headcount_sanctioned");
            e.Property(x => x.ShiftTimings).HasColumnName("shift_timings").HasMaxLength(120);
            e.Property(x => x.SkillType).HasColumnName("skill_type").HasMaxLength(40);
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
            // Was "vendors" but that table now holds society fruit/veg vendors.
            // Re-point promotions to a separate physical table (create it if needed).
            e.ToTable("promotion_vendors");
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

        modelBuilder.Entity<EventItem>(e =>
        {
            e.ToTable("events");
            e.HasKey(x => x.Id);
            e.Property(x => x.SocietyId).HasColumnName("society_id");
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50).IsRequired();
            e.Property(x => x.Venue).HasColumnName("venue").HasMaxLength(200);
            e.Property(x => x.StartDatetime).HasColumnName("start_datetime");
            e.Property(x => x.EndDatetime).HasColumnName("end_datetime");
            e.Property(x => x.OrganizerName).HasColumnName("organizer_name").HasMaxLength(100);
            e.Property(x => x.OrganizerContact).HasColumnName("organizer_contact").HasMaxLength(20);
            e.Property(x => x.MaxParticipants).HasColumnName("max_participants");
            e.Property(x => x.RegistrationRequired).HasColumnName("registration_required");
            e.Property(x => x.RegistrationLink).HasColumnName("registration_link");
            e.Property(x => x.EntryFee).HasColumnName("entry_fee").HasPrecision(10, 2);
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(20);
            e.Property(x => x.Active).HasColumnName("active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            e.HasIndex(x => x.SocietyId);
            e.HasIndex(x => x.StartDatetime);
        });

        modelBuilder.Entity<ClassDef>(e =>
        {
            e.ToTable("classes");
            e.HasKey(x => x.Id);
            e.Property(x => x.SocietyId).HasColumnName("society_id");
            e.Property(x => x.ClassName).HasColumnName("class_name").HasMaxLength(150).IsRequired();
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50).IsRequired();
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.InstructorName).HasColumnName("instructor_name").HasMaxLength(100).IsRequired();
            e.Property(x => x.InstructorPhone).HasColumnName("instructor_phone").HasMaxLength(20);
            e.Property(x => x.InstructorEmail).HasColumnName("instructor_email").HasMaxLength(100);
            e.Property(x => x.Venue).HasColumnName("venue").HasMaxLength(150);
            e.Property(x => x.Capacity).HasColumnName("capacity");
            e.Property(x => x.AgeGroup).HasColumnName("age_group").HasMaxLength(50);
            e.Property(x => x.FeeMonthly).HasColumnName("fee_monthly").HasPrecision(10, 2);
            e.Property(x => x.Active).HasColumnName("active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            e.HasIndex(x => x.SocietyId);
        });

        modelBuilder.Entity<ClassSchedule>(e =>
        {
            e.ToTable("class_schedules");
            e.HasKey(x => x.Id);
            e.Property(x => x.ClassId).HasColumnName("class_id");
            e.Property(x => x.DayOfWeek).HasColumnName("day_of_week");
            e.Property(x => x.StartTime).HasColumnName("start_time");
            e.Property(x => x.EndTime).HasColumnName("end_time");
            e.Property(x => x.Recurring).HasColumnName("recurring");
            e.Property(x => x.StartDate).HasColumnName("start_date");
            e.Property(x => x.EndDate).HasColumnName("end_date");
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(20);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasOne(x => x.Class).WithMany(c => c.Schedules).HasForeignKey(x => x.ClassId);
            e.HasIndex(x => x.ClassId);
        });

        modelBuilder.Entity<SocietyVendor>(e =>
        {
            e.ToTable("vendors");
            e.HasKey(x => x.Id);
            e.Property(x => x.SocietyId).HasColumnName("society_id");
            e.Property(x => x.VendorName).HasColumnName("vendor_name").HasMaxLength(150).IsRequired();
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50).IsRequired();
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.PhoneNumber).HasColumnName("phone_number").HasMaxLength(20);
            e.Property(x => x.WhatsappNumber).HasColumnName("whatsapp_number").HasMaxLength(20);
            e.Property(x => x.StallName).HasColumnName("stall_name").HasMaxLength(150);
            e.Property(x => x.StallLocation).HasColumnName("stall_location").HasMaxLength(150);
            e.Property(x => x.AvailableDays).HasColumnName("available_days").HasColumnType("text[]");
            e.Property(x => x.AvailableFrom).HasColumnName("available_from");
            e.Property(x => x.AvailableTo).HasColumnName("available_to");
            e.Property(x => x.StartDate).HasColumnName("start_date");
            e.Property(x => x.EndDate).HasColumnName("end_date");
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
            e.Property(x => x.Verified).HasColumnName("verified");
            e.Property(x => x.Rating).HasColumnName("rating").HasPrecision(2, 1);
            e.Property(x => x.Active).HasColumnName("active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            e.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            e.HasIndex(x => x.SocietyId);
            e.HasIndex(x => x.Category);
        });

        // ── Chatbot memory + RAG ─────────────────────────────────────────────
        modelBuilder.Entity<ChatSession>(e =>
        {
            e.ToTable("chat_sessions");
            e.HasKey(x => x.Id);
            e.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
            e.Property(x => x.Title).HasColumnName("title");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.LastAt).HasColumnName("last_at");
            e.HasIndex(x => new { x.UserId, x.LastAt });
        });

        modelBuilder.Entity<ChatMessage>(e =>
        {
            e.ToTable("chat_messages");
            e.HasKey(x => x.Id);
            e.Property(x => x.SessionId).HasColumnName("session_id");
            e.Property(x => x.Role).HasColumnName("role").HasMaxLength(20).IsRequired();
            e.Property(x => x.Content).HasColumnName("content").IsRequired();
            e.Property(x => x.ToolName).HasColumnName("tool_name").HasMaxLength(100);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => new { x.SessionId, x.CreatedAt });
        });

        modelBuilder.Entity<ResidentFact>(e =>
        {
            e.ToTable("resident_facts");
            e.HasKey(x => new { x.UserId, x.FactKey });
            e.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(200).IsRequired();
            e.Property(x => x.FactKey).HasColumnName("fact_key").HasMaxLength(80).IsRequired();
            e.Property(x => x.FactValue).HasColumnName("fact_value").IsRequired();
            e.Property(x => x.Source).HasColumnName("source").HasMaxLength(30);
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<SocietyDoc>(e =>
        {
            e.ToTable("society_docs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
            e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50);
            e.Property(x => x.Content).HasColumnName("content").IsRequired();
            e.Property(x => x.Tags).HasColumnName("tags").HasColumnType("text[]");
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            // search_vec is a generated column managed by Postgres — don't map.
            e.Ignore("SearchVec");
            e.HasIndex(x => x.Category);
        });

        modelBuilder.Entity<WaterVendor>(e =>
        {
            e.ToTable("water_vendors");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            e.Property(x => x.ContactNumber).HasColumnName("contact_number").HasMaxLength(30);
            e.Property(x => x.Address).HasColumnName("address");
            e.Property(x => x.VehicleNo).HasColumnName("vehicle_no").HasMaxLength(30);
            e.Property(x => x.TankerCapacityKl)
                .HasColumnName("tanker_capacity_kl")
                .HasColumnType("numeric")
                .HasDefaultValue(6m);
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.VehicleNo);
            e.HasMany(x => x.Vehicles)
                .WithOne(x => x.Vendor)
                .HasForeignKey(x => x.VendorId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WaterVendorVehicle>(e =>
        {
            e.ToTable("water_vendor_vehicles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.VehicleNo).HasColumnName("vehicle_no").HasMaxLength(20).IsRequired();
            e.Property(x => x.IsActive).HasColumnName("is_active");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.DeactivatedAt).HasColumnName("deactivated_at");
            e.HasIndex(x => new { x.VendorId, x.VehicleNo }).IsUnique();
            e.HasIndex(x => x.VehicleNo);
        });

        modelBuilder.Entity<WaterRecord>(e =>
        {
            e.ToTable("water_records");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Date).HasColumnName("date").HasColumnType("date").IsRequired();
            e.Property(x => x.Source).HasColumnName("source");
            e.Property(x => x.SourceType).HasColumnName("source_type").HasMaxLength(30);
            e.Property(x => x.VehicleNo).HasColumnName("vehicle_no").HasMaxLength(30);
            e.Property(x => x.OpeningMeter).HasColumnName("opening_meter");
            e.Property(x => x.ClosingMeter).HasColumnName("closing_meter");
            e.Property(x => x.Tds).HasColumnName("tds");
            e.Property(x => x.Load).HasColumnName("load");
            e.Property(x => x.TankLevelKl).HasColumnName("tank_level_kl").HasColumnType("numeric");
            e.Property(x => x.VendorId).HasColumnName("vendor_id");
            e.Property(x => x.Notes).HasColumnName("notes");
            e.Property(x => x.ReceiptUrl).HasColumnName("receipt_url");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.CreatedBy).HasColumnName("created_by");
            e.HasIndex(x => x.Date);
            e.HasIndex(x => x.VendorId);
        });

        modelBuilder.Entity<WaterRecordPhoto>(e =>
        {
            e.ToTable("water_record_photos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.RecordId).HasColumnName("record_id").IsRequired();
            e.Property(x => x.PhotoType).HasColumnName("photo_type").HasMaxLength(40).IsRequired();
            e.Property(x => x.PhotoUrl).HasColumnName("photo_url").IsRequired();
            e.Property(x => x.StoragePath).HasColumnName("storage_path");
            e.Property(x => x.DetectedValue).HasColumnName("detected_value");
            e.Property(x => x.ScanConfidence).HasColumnName("scan_confidence").HasColumnType("numeric");
            e.Property(x => x.Latitude).HasColumnName("latitude").HasColumnType("numeric");
            e.Property(x => x.Longitude).HasColumnName("longitude").HasColumnType("numeric");
            e.Property(x => x.CapturedAt).HasColumnName("captured_at");
            e.Property(x => x.MimeType).HasColumnName("mime_type").HasMaxLength(60);
            e.Property(x => x.SizeBytes).HasColumnName("size_bytes");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.RecordId);
            e.HasIndex(x => x.PhotoType);
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
