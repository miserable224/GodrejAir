/**
 * Concierge chat panel — reusable chat UI shared by HomeScreen
 * (embedded, full-bleed) and the standalone ChatbotScreen route.
 *
 * The panel exposes the same composer + bubble + chip layout used in v1
 * of ChatbotScreen, but accepts an optional `header` so each host
 * decides what to show above the conversation.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DARK } from '../../../constants/theme';
import { sendChatMessage } from '../../../modules/chat/services/chatService';

const STARTER_SUGGESTIONS = [
  "What classes are happening today?",
  "Any events this week?",
  "Is the fruit vendor coming today?",
  "Show me vendors for Saturday",
];

// Words that wipe the conversation locally without round-tripping to the API.
// Match any leading/trailing whitespace; allow common typos like "clas" / "cls".
const CLEAR_COMMANDS = new Set([
  'clear',
  'clear screen',
  'clear chat',
  'clear all',
  'clear history',
  'reset',
  'reset chat',
  'cls',
  'clas',
  'clera',
  'new chat',
  'start over',
  '/clear',
  '/reset',
]);

function isClearCommand(text) {
  return CLEAR_COMMANDS.has(String(text || '').trim().toLowerCase());
}

function makeId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Bubbles ────────────────────────────────────────────────────────────────

function UserBubble({ text }) {
  return (
    <View style={[styles.row, styles.rowRight]}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    </View>
  );
}

function BotBubble({ text, children }) {
  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View style={styles.botAvatar}>
        <Ionicons name="sparkles" size={14} color={DARK.teal} />
      </View>
      <View style={styles.botBubble}>
        {text ? <Text style={styles.botText}>{text}</Text> : null}
        {children}
      </View>
    </View>
  );
}

function TypingBubble() {
  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View style={styles.botAvatar}>
        <Ionicons name="sparkles" size={14} color={DARK.teal} />
      </View>
      <View style={[styles.botBubble, styles.typing]}>
        <ActivityIndicator size="small" color={DARK.teal} />
        <Text style={styles.typingText}>Thinking…</Text>
      </View>
    </View>
  );
}

// ─── Entity cards ───────────────────────────────────────────────────────────

function formatTime12(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

function formatINR(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `₹${n.toLocaleString('en-IN')}`;
}

function ClassCard({ item }) {
  const fee = formatINR(item.feeMonthly);
  const todayTime = formatTime12(item.todayStartTime ?? item.startTime);
  const schedule = item.schedule || '';
  const phone = item.instructorPhone;

  const callTrainer = () => {
    if (!phone) return;
    Linking.openURL(`tel:${String(phone).replace(/\s+/g, '')}`).catch(() => {});
  };

  return (
    <View style={richCard.card}>
      {/* Header */}
      <View style={richCard.header}>
        <View style={richCard.headerIcon}>
          <Ionicons name="fitness" size={16} color={DARK.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={richCard.title} numberOfLines={1}>{item.name}</Text>
          {todayTime ? (
            <Text style={richCard.subtitle} numberOfLines={1}>
              Today at {todayTime}
            </Text>
          ) : null}
        </View>
        {item.category ? <Text style={richCard.tag}>{item.category}</Text> : null}
      </View>

      {/* Body */}
      <View style={richCard.body}>
        {item.instructor ? (
          <View style={richCard.row}>
            <Ionicons name="person-outline" size={13} color={DARK.muted} />
            <Text style={richCard.rowText} numberOfLines={1}>
              <Text style={richCard.rowLabel}>Trainer </Text>
              {item.instructor}
            </Text>
            {phone ? (
              <TouchableOpacity style={richCard.callBtn} onPress={callTrainer}>
                <Ionicons name="call" size={11} color={DARK.teal} />
                <Text style={richCard.callBtnText}>{phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {schedule ? (
          <View style={richCard.row}>
            <Ionicons name="calendar-outline" size={13} color={DARK.muted} />
            <Text style={richCard.rowText} numberOfLines={2}>
              <Text style={richCard.rowLabel}>When </Text>
              {schedule}
            </Text>
          </View>
        ) : null}

        {(fee || item.venue || item.ageGroup) ? (
          <View style={richCard.metaRow}>
            {fee ? (
              <View style={richCard.metaPill}>
                <Ionicons name="pricetag-outline" size={11} color="#F59E0B" />
                <Text style={richCard.metaPillText}>{fee}/mo</Text>
              </View>
            ) : null}
            {item.venue ? (
              <View style={richCard.metaPill}>
                <Ionicons name="location-outline" size={11} color="#A78BFA" />
                <Text style={richCard.metaPillText} numberOfLines={1}>{item.venue}</Text>
              </View>
            ) : null}
            {item.ageGroup ? (
              <View style={richCard.metaPill}>
                <Ionicons name="people-outline" size={11} color="#10B981" />
                <Text style={richCard.metaPillText} numberOfLines={1}>{item.ageGroup}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function EventCard({ item }) {
  const when = item.startDatetime
    ? new Date(item.startDatetime).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
    : '';
  return (
    <View style={cardStyles.card}>
      <View style={[cardStyles.iconBox, { backgroundColor: '#F59E0B22' }]}>
        <Ionicons name="calendar" size={16} color="#F59E0B" />
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={cardStyles.sub} numberOfLines={1}>
          {when}{item.venue ? ` · ${item.venue}` : ''}
        </Text>
      </View>
      <Text style={cardStyles.tag}>{item.category}</Text>
    </View>
  );
}

function VendorCard({ item }) {
  const time =
    item.availableFrom && item.availableTo
      ? `${formatTime12(item.availableFrom)}–${formatTime12(item.availableTo)}`
      : 'All day';
  const callVendor = () => {
    if (!item.phone) return;
    Linking.openURL(`tel:${String(item.phone).replace(/\s+/g, '')}`).catch(() => {});
  };
  return (
    <View style={cardStyles.card}>
      <View style={[cardStyles.iconBox, { backgroundColor: '#10B98122' }]}>
        <Ionicons name="storefront" size={16} color="#10B981" />
      </View>
      <View style={cardStyles.info}>
        <Text style={cardStyles.title} numberOfLines={1}>
          {item.name} {item.verified ? '✓' : ''}
        </Text>
        <Text style={cardStyles.sub} numberOfLines={1}>
          {time}{item.location ? ` · ${item.location}` : ''}
        </Text>
        {item.phone ? (
          <TouchableOpacity onPress={callVendor} activeOpacity={0.7}>
            <Text style={cardStyles.phone} numberOfLines={1}>
              <Ionicons name="call" size={11} color={DARK.teal} /> {item.phone}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {item.phone ? (
        <TouchableOpacity
          style={cardStyles.iconBtn}
          onPress={callVendor}
          activeOpacity={0.7}
          accessibilityLabel={`Call ${item.name}`}
        >
          <Ionicons name="call" size={14} color={DARK.teal} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EntityList({ intent, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <View style={{ marginTop: 10, gap: 8 }}>
      {items.slice(0, 6).map((it, idx) => {
        if (intent === 'get_classes')
          return <ClassCard key={`c-${idx}`} item={it} />;
        if (intent === 'get_events')
          return <EventCard key={`e-${idx}`} item={it} />;
        if (intent === 'get_vendors')
          return <VendorCard key={`v-${idx}`} item={it} />;
        return null;
      })}
      {items.length > 6 ? (
        <Text style={cardStyles.more}>+{items.length - 6} more…</Text>
      ) : null}
    </View>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {React.ReactNode} [props.header]   Optional content above the chat list
 * @param {string} [props.greeting]           First bot message
 * @param {boolean} [props.withSafeBottom]    Whether to add bottom safe-area inset to composer
 */
export default function ConciergePanel({
  header,
  greeting,
  withSafeBottom = false,
}) {
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState(STARTER_SUGGESTIONS);
  const [messages, setMessages] = useState(() => [
    {
      id: makeId(),
      role: 'bot',
      text:
        greeting ??
        "Hi! I can help with classes, events, and society vendors. Tap a suggestion or type a question.",
    },
  ]);
  const listRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const resetChat = useCallback(() => {
    setInput('');
    setBusy(false);
    setSessionId(null);
    setSuggestions(STARTER_SUGGESTIONS);
    setMessages([
      {
        id: makeId(),
        role: 'bot',
        text:
          greeting ??
          "Hi! I can help with classes, events, and society vendors. Tap a suggestion or type a question.",
      },
    ]);
  }, [greeting]);

  const sendText = useCallback(async (text) => {
    const trimmed = (text ?? '').trim();
    if (!trimmed || busy) return;

    // Local-only commands: clear / reset / cls / etc.
    if (isClearCommand(trimmed)) {
      resetChat();
      return;
    }

    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', text: trimmed },
      { id: 'typing', role: 'typing' },
    ]);
    setBusy(true);

    try {
      const resp = await sendChatMessage(trimmed, sessionId);
      const items = resp?.data?.items ?? [];
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'typing'),
        {
          id: makeId(),
          role: 'bot',
          text: resp?.reply ?? '…',
          intent: resp?.intent,
          items,
        },
      ]);
      if (resp?.sessionId) setSessionId(resp.sessionId);
      if (Array.isArray(resp?.suggestions) && resp.suggestions.length) {
        setSuggestions(resp.suggestions);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'typing'),
        {
          id: makeId(),
          role: 'bot',
          text: `Sorry — I couldn't fetch that. ${err?.message ?? ''}`.trim(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, sessionId, resetChat]);

  const renderItem = useCallback(({ item }) => {
    if (item.role === 'user') return <UserBubble text={item.text} />;
    if (item.role === 'typing') return <TypingBubble />;
    return (
      <BotBubble text={item.text}>
        <EntityList intent={item.intent} items={item.items} />
      </BotBubble>
    );
  }, []);

  const keyExtractor = useCallback((m) => m.id, []);

  const composerBottom = useMemo(
    () => (withSafeBottom ? Math.max(insets.bottom, 12) : 12),
    [withSafeBottom, insets.bottom],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {header}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={scrollToEnd}
        showsVerticalScrollIndicator={false}
      />

      {suggestions.length > 0 ? (
        <View style={styles.chipRow}>
          <FlatList
            data={suggestions}
            keyExtractor={(s, i) => `s-${i}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chip}
                onPress={() => sendText(item)}
                disabled={busy}
              >
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      <View style={[styles.composer, { paddingBottom: composerBottom }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about classes, events, vendors…"
          placeholderTextColor={DARK.muted}
          style={styles.input}
          multiline
          editable={!busy}
          onSubmitEditing={() => sendText(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || busy) && styles.sendBtnDisabled]}
          onPress={() => sendText(input)}
          disabled={!input.trim() || busy}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={!input.trim() || busy ? DARK.muted : '#08121A'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK.bg },

  listContent: { padding: 12, paddingBottom: 12, gap: 10 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },

  userBubble: {
    maxWidth: '82%',
    backgroundColor: DARK.teal,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  userText: { color: '#08121A', fontSize: 14, lineHeight: 19, fontWeight: '500' },

  botAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#0F3D3A',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: DARK.teal + '55',
    marginBottom: 4,
  },
  botBubble: {
    maxWidth: '82%',
    backgroundColor: DARK.card,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  botText: { color: DARK.text, fontSize: 14, lineHeight: 20 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { color: DARK.muted, fontSize: 13 },

  chipRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: DARK.inputBorder,
    backgroundColor: DARK.bg,
  },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: DARK.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
  },
  chipText: { color: DARK.text, fontSize: 12, fontWeight: '600' },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: DARK.inputBorder,
    backgroundColor: DARK.card,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: DARK.text,
    backgroundColor: DARK.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    fontSize: 14,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: DARK.teal,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: DARK.inputBorder },
});

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: DARK.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  iconBox: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: DARK.teal + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: DARK.text, fontSize: 13, fontWeight: '700' },
  sub: { color: DARK.muted, fontSize: 11, marginTop: 1 },
  phone: { color: DARK.teal, fontSize: 11, marginTop: 3, fontWeight: '600' },
  tag: {
    color: DARK.teal, fontSize: 10, fontWeight: '700',
    backgroundColor: DARK.teal + '14',
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  iconBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: DARK.teal + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  more: { color: DARK.muted, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
});

// Class card — richer multi-line layout (trainer, schedule, fee, venue, age)
const richCard = StyleSheet.create({
  card: {
    backgroundColor: DARK.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: DARK.teal + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: DARK.text, fontSize: 14, fontWeight: '700' },
  subtitle: { color: DARK.muted, fontSize: 11, marginTop: 1 },
  tag: {
    color: DARK.teal, fontSize: 10, fontWeight: '700',
    backgroundColor: DARK.teal + '18',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: DARK.inputBorder,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowText: {
    flex: 1,
    color: DARK.text,
    fontSize: 12,
    lineHeight: 16,
  },
  rowLabel: {
    color: DARK.muted,
    fontWeight: '600',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: DARK.teal + '18',
    borderRadius: 8,
  },
  callBtnText: {
    color: DARK.teal,
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: DARK.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DARK.inputBorder,
  },
  metaPillText: {
    color: DARK.text,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 180,
  },
});
