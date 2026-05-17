  const renderWorkforceDetails = () => {
    const s1Actual = staffCounts.reduce((s, c) => s + c.actualS1, 0);
    const s2Actual = staffCounts.reduce((s, c) => s + c.actualS2, 0);
    const totalExpected = staffCounts.reduce((s, c) => s + c.expected, 0) * 2; // Total for both shifts

    const shortages = staffCounts.filter((c) => c.actualS1 < c.expected || c.actualS2 < c.expected);

    const fmHkStaff = staffCounts.filter(c => c.category === 'FM_HK');
    const securityStaff = staffCounts.filter(c => c.category === 'Security');

    const fmHkS1 = fmHkStaff.reduce((s, c) => s + c.actualS1, 0);
    const fmHkS2 = fmHkStaff.reduce((s, c) => s + c.actualS2, 0);
    const fmHkExp = fmHkStaff.reduce((s, c) => s + c.expected, 0);
    
    const securityS1 = securityStaff.reduce((s, c) => s + c.actualS1, 0);
    const securityS2 = securityStaff.reduce((s, c) => s + c.actualS2, 0);
    const securityExp = securityStaff.reduce((s, c) => s + c.expected, 0);

    return (
      <View style={styles.detailsInner}>
        {/* Attendance Filters */}
        <View style={styles.filterSection}>
          <View style={styles.shiftToggleRow}>
            <Text style={styles.filterSectionTitle}>Current View</Text>
            <View style={styles.shiftPills}>
              <TouchableOpacity 
                style={[styles.shiftPill, activeShift === 1 && styles.shiftPillActive]}
                onPress={() => setActiveShift(1)}
              >
                <Text style={[styles.shiftPillText, activeShift === 1 && styles.shiftPillTextActive]}>Shift 1</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.shiftPill, activeShift === 2 && styles.shiftPillActive]}
                onPress={() => setActiveShift(2)}
              >
                <Text style={[styles.shiftPillText, activeShift === 2 && styles.shiftPillTextActive]}>Shift 2</Text>
              </TouchableOpacity>
            </View>
          </View>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Reporting Period</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['May 2026', 'April 2026', 'March 2026'].map((m) => (
              <TouchableOpacity 
                key={m}
                style={[styles.premiumChip, staffSelectedMonth === m && styles.premiumChipActive]}
                onPress={() => {
                  setStaffSelectedMonth(m);
                  setStaffFilterPeriod('month');
                }}
              >
                <Text style={[styles.premiumChipText, staffSelectedMonth === m && styles.premiumChipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.premiumChip, staffFilterPeriod === 'custom' && styles.premiumChipActive]}
              onPress={() => setStaffFilterPeriod('custom')}
            >
              <Ionicons name="calendar-outline" size={14} color={staffFilterPeriod === 'custom' ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.premiumChipText, staffFilterPeriod === 'custom' && styles.premiumChipTextActive, { marginLeft: 6 }]}>Custom Range</Text>
            </TouchableOpacity>
          </ScrollView>

          {staffFilterPeriod === 'custom' && (
            <View style={styles.customRangeRow}>
              <View style={styles.rangeInputWrap}>
                <Text style={styles.rangeLabel}>From</Text>
                <TextInput style={styles.rangeInput} placeholder="DD/MM/YYYY" />
              </View>
              <View style={styles.rangeInputWrap}>
                <Text style={styles.rangeLabel}>To</Text>
                <TextInput style={styles.rangeInput} placeholder="DD/MM/YYYY" />
              </View>
            </View>
          )}
        </View>

        {/* Period Summary Card */}
        <View style={styles.periodSummaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryTitle}>Period Insights: {staffSelectedMonth}</Text>
            <View style={styles.avgBadge}>
              <Text style={styles.avgBadgeText}>92% Avg. Attendance</Text>
            </View>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryVal}>42.5</Text>
              <Text style={styles.summaryLab}>Avg. Daily Staff</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryVal}>06</Text>
              <Text style={styles.summaryLab}>Total Shortages</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={[styles.summaryVal, { color: COLORS.danger }]}>₹2,000</Text>
              <Text style={styles.summaryLab}>Total Penalties</Text>
            </View>
          </View>
        </View>

        {/* Live Attendance Pulse */}
        <Text style={styles.moduleSubsectionTitle}>Current Pulse (Today)</Text>
        <LinearGradient
          colors={['#EEF2FF', '#E0E7FF']}
          style={styles.attendanceHero}
        >
          <View style={styles.attendanceTop}>
            <View>
              <Text style={styles.attendanceTitle}>Live Attendance Pulse</Text>
              <Text style={styles.attendanceDate}>May 11, 2026 · General Shift</Text>
            </View>
            <View style={[styles.statusBadge, totalActual < totalExpected ? styles.statusBadgeWarn : styles.statusBadgeSuccess]}>
              <Text style={[styles.statusBadgeText, totalActual < totalExpected ? styles.statusBadgeTextWarn : styles.statusBadgeTextSuccess]}>
                {totalActual < totalExpected ? 'Shortage detected' : 'Fully staffed'}
              </Text>
            </View>
          </View>

          <View style={styles.attendanceStats}>
            <View style={styles.attendanceStatBox}>
              <Text style={styles.attendanceStatValue}>
                {activeShift === 1 ? fmHkS1 : fmHkS2} / {fmHkExp}
              </Text>
              <Text style={styles.attendanceStatLabel}>FM & HK (S{activeShift})</Text>
            </View>
            <View style={styles.attendanceStatDivider} />
            <View style={styles.attendanceStatBox}>
              <Text style={styles.attendanceStatValue}>
                {activeShift === 1 ? securityS1 : securityS2} / {securityExp}
              </Text>
              <Text style={styles.attendanceStatLabel}>Security (S{activeShift})</Text>
            </View>
          </View>

          {staffPenaltyCount >= 2 && (
            <View style={styles.penaltyWarning}>
              <Ionicons name="warning-outline" size={14} color="#B45309" />
              <Text style={styles.penaltyWarningText}>
                {staffPenaltyCount === 2 
                  ? 'Warning: 1 more leave will trigger INR 1000 penalty.' 
                  : 'Penalty active: INR 1000 deduction per extra leave.'}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.actionTile, { width: '48%', marginBottom: 12 }]} 
            onPress={() => {
              setRecordStaffType('FM_HK');
              setRecordStaffOpen(true);
            }}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.fullActionGradient}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="people" size={18} color={COLORS.white} />
              </View>
              <Text style={styles.splitActionText}>FM & HK{"\n"}Attendance</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionTile, { width: '48%', marginBottom: 12 }]} 
            onPress={() => {
              setRecordStaffType('Security');
              setRecordStaffOpen(true);
            }}
          >
            <LinearGradient colors={['#1A1F5E', '#101435']} style={styles.fullActionGradient}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.white} />
              </View>
              <Text style={styles.splitActionText}>Security{"\n"}Attendance</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Shortage Alerts */}
        {shortages.length > 0 && (
          <View style={styles.shortageSection}>
            <Text style={styles.shortageTitle}>Shortage Alerts</Text>
            {shortages.map((s) => (
              <View key={s.id} style={styles.shortageRow}>
                <View style={styles.shortageInfo}>
                  <Text style={styles.shortageRole}>{s.role}</Text>
                  <Text style={styles.shortageMeta}>{s.category === 'Security' ? 'Security' : 'Ops'} · {s.shift}</Text>
                </View>
                <View style={styles.shortageCount}>
                  <Text style={styles.shortageValue}>
                    -{activeShift === 1 ? s.expected - s.actualS1 : s.expected - s.actualS2}
                  </Text>
                  <Text style={styles.shortageUnit}>Staff (S{activeShift})</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Deployment Snapshot */}
        <View style={styles.deploymentSection}>
          <TouchableOpacity 
            style={styles.expandableHeader} 
            onPress={() => setFmHkExpanded(!fmHkExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.deploymentTitle}>FM & Housekeeping Snapshot</Text>
            <Ionicons 
              name={fmHkExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>
          
          {fmHkExpanded && fmHkStaff.map((item) => (
            <View key={item.id} style={styles.deploymentRow}>
              <View style={styles.deploymentMain}>
                <Text style={styles.deploymentRole}>{item.role}</Text>
                <Text style={styles.deploymentType}>{item.type} · {item.shift}</Text>
              </View>
              <View style={styles.deploymentStatus}>
                <View style={styles.shiftStatusCol}>
                  <Text style={[styles.deploymentActual, item.actualS1 < item.expected && styles.textWarn]}>
                    {item.actualS1}
                  </Text>
                  <Text style={styles.shiftMiniLab}>S1</Text>
                </View>
                <View style={styles.shiftStatusCol}>
                  <Text style={[styles.deploymentActual, item.actualS2 < item.expected && styles.textWarn]}>
                    {item.actualS2}
                  </Text>
                  <Text style={styles.shiftMiniLab}>S2</Text>
                </View>
                <Text style={styles.deploymentExpected}>/ {item.expected}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity 
            style={[styles.expandableHeader, { marginTop: 24 }]} 
            onPress={() => setSecurityExpanded(!securityExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.deploymentTitle}>Security Snapshot</Text>
            <Ionicons 
              name={securityExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={COLORS.textSecondary} 
            />
          </TouchableOpacity>
          
          {securityExpanded && securityStaff.map((item) => (
            <View key={item.id} style={styles.deploymentRow}>
              <View style={styles.deploymentMain}>
                <Text style={styles.deploymentRole}>{item.role}</Text>
                <Text style={styles.deploymentType}>{item.type} · {item.shift}</Text>
              </View>
              <View style={styles.deploymentStatus}>
                <View style={styles.shiftStatusCol}>
                  <Text style={[styles.deploymentActual, item.actualS1 < item.expected && styles.textWarn]}>
                    {item.actualS1}
                  </Text>
                  <Text style={styles.shiftMiniLab}>S1</Text>
                </View>
                <View style={styles.shiftStatusCol}>
                  <Text style={[styles.deploymentActual, item.actualS2 < item.expected && styles.textWarn]}>
                    {item.actualS2}
                  </Text>
                  <Text style={styles.shiftMiniLab}>S2</Text>
                </View>
                <Text style={styles.deploymentExpected}>/ {item.expected}</Text>
              </View>
            </View>
          ))}
        </View>

        {renderStaffForm()}
      </View>
    );
  };

