import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAppTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { studyService } from '../services/studyService';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface AttachedFile {
  name: string;
  type: 'image' | 'pdf';
  mimeType: string;
  uri: string;
  size?: number;
  base64?: string | null;
}

interface SolvedDoubt {
  id: string;
  query: string;
  subject: string;
  chapter: string;
  answer: string;
  fileName?: string | null;
  fileType?: string | null;
  keyTakeaways: string[];
  suggestedFollowups: string[];
  sources: Array<{ document_id: string; file_name: string; excerpt: string }>;
  timestamp: string;
}

interface DoubtSubmission {
  query: string;
  subject: string;
  chapter: string;
  attachedFile: AttachedFile | null;
}

function getDoubtErrorMessage(error: any): string {
  const status = error?.status;
  const code = error?.code;

  if (status === 502 || code === 'AI_PROVIDER_INVALID_RESPONSE') {
    return 'The AI service gateway is temporarily unavailable. Your question and attachment are saved; please retry shortly.';
  }
  if (status === 429 || code === 'AI_PROVIDER_RATE_LIMITED') {
    return 'The AI service is busy. Please wait a moment and retry.';
  }
  if (status === 503 || code === 'AI_PROVIDER_NOT_CONFIGURED' || code === 'AI_PROVIDER_CONFIGURATION') {
    return 'The AI service is temporarily unavailable. Your question and attachment are saved; please retry shortly.';
  }
  if (status === 504 || code === 'AI_PROVIDER_TIMEOUT') {
    return 'The AI service took too long to respond. Your question and attachment are saved; please retry.';
  }
  if (status === 413) {
    return 'The attachment is too large. Please choose a file smaller than 10 MB.';
  }
  if (status === 415 || status === 400 || status === 422) {
    return error?.message || 'Please check your question and attachment, then try again.';
  }
  if (error?.isNetworkError || !status) {
    return 'Could not reach ESpark. Check your internet connection and retry.';
  }
  if (status >= 500) {
    return 'ESpark could not complete the request. Your question and attachment are saved; please retry.';
  }
  return error?.message || 'Could not solve the doubt. Please try again.';
}

export function formatCleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // strip markdown bold/italic asterisks
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, '') // strip markdown header tags
    .replace(/^[ \t]*\*[ \t]+/gm, '• ') // replace asterisk bullets with clean dots
    .replace(/(\d+)[ \t]*\*[ \t]*(\d+)/g, '$1 × $2') // clean multiplication
    .replace(/\*/g, '') // remove stray asterisks
    .replace(/`/g, '') // remove backticks
    .trim();
}

export default function DoubtSolverScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('Auto-Detect');
  const [chapter, setChapter] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<SolvedDoubt[]>([]);
  const isSubmittingRef = useRef(false);
  const retrySubmissionRef = useRef<DoubtSubmission | null>(null);

  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      setErrorMessage(null);
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Camera permission is required to take a photo of your question.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setErrorMessage('Photo library permission is required to attach an image.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            base64: true,
          });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName || `Question_Photo_${Date.now().toString().slice(-4)}.jpg`;
      const lowerName = fileName.toLowerCase();
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const isValidFormat =
        validExtensions.some((ext) => lowerName.endsWith(ext)) ||
        (asset.mimeType && ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType));

      if (!isValidFormat) {
        setErrorMessage('Unsupported image format. Allowed formats: JPEG, PNG, WEBP.');
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        setErrorMessage(`Image is too large (${formatFileSize(asset.fileSize)}). Maximum size allowed is 10MB.`);
        return;
      }

      let b64 = asset.base64;
      if (!b64 && asset.uri) {
        b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      }

      setAttachedFile({
        name: fileName,
        type: 'image',
        mimeType: asset.mimeType || (lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg'),
        uri: asset.uri,
        size: asset.fileSize || 0,
        base64: b64,
      });
      setErrorMessage(null);
    } catch (err: any) {
      console.warn('[DoubtSolver] Image picker error:', err);
      setErrorMessage('Could not select image: ' + (err.message || 'Please try again.'));
    }
  };

  const handlePickPDF = async () => {
    try {
      setErrorMessage(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.name || 'Document.pdf';
      const isPdf =
        fileName.toLowerCase().endsWith('.pdf') ||
        asset.mimeType === 'application/pdf';

      if (!isPdf) {
        setErrorMessage('Unsupported file format. Please select a valid PDF file.');
        return;
      }

      if (asset.size && asset.size > MAX_FILE_SIZE) {
        setErrorMessage(`PDF is too large (${formatFileSize(asset.size)}). Maximum size allowed is 10MB.`);
        return;
      }

      const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });

      setAttachedFile({
        name: fileName,
        type: 'pdf',
        mimeType: 'application/pdf',
        uri: asset.uri,
        size: asset.size || 0,
        base64: b64,
      });
      setErrorMessage(null);
    } catch (err: any) {
      console.warn('[DoubtSolver] PDF picker error:', err);
      setErrorMessage('Could not select PDF: ' + (err.message || 'Please try again.'));
    }
  };

  const handleClearAttachment = () => {
    setAttachedFile(null);
  };

  const handleSubmit = async (overrideQuery?: string, retrySubmission?: DoubtSubmission | null) => {
    if (isSubmittingRef.current) return;

    const submission = retrySubmission || {
      query: overrideQuery ?? query,
      subject,
      chapter,
      attachedFile,
    };
    const doubtText = submission.query.trim();
    if (!doubtText && !submission.attachedFile) {
      setErrorMessage('Please type a question or attach an image / PDF before asking.');
      return;
    }

    isSubmittingRef.current = true;
    retrySubmissionRef.current = submission;
    setErrorMessage(null);
    setLoading(true);

    try {
      const activeSubject = submission.subject;
      const activeChapter = submission.chapter || 'General';
      const promptQuery = doubtText || (submission.attachedFile ? 'Please analyze the attached image/document in detail, extract the question or diagram, and provide a comprehensive step-by-step academic solution with all intermediate formulas and principles.' : '');

      const response = await studyService.askAIDoubt({
        query: promptQuery,
        subject: activeSubject,
        chapter: activeChapter,
        fileContent: submission.attachedFile?.base64 || null,
        fileName: submission.attachedFile?.name || null,
        fileType: submission.attachedFile?.mimeType || null,
      });

      const data = response?.data || response;
      if (typeof data?.answer !== 'string' || !data.answer.trim()) {
        throw { code: 'AI_PROVIDER_INVALID_RESPONSE', status: 502 };
      }
      const newDoubt: SolvedDoubt = {
        id: `dbt-${Date.now()}`,
        query: doubtText || `[Attached ${submission.attachedFile?.type?.toUpperCase()}] ${submission.attachedFile?.name}`,
        subject: activeSubject,
        chapter: activeChapter,
        answer: formatCleanText(data.answer),
        fileName: submission.attachedFile?.name,
        fileType: submission.attachedFile?.type,
        keyTakeaways: Array.isArray(data.key_takeaways)
          ? data.key_takeaways.map((k: string) => formatCleanText(k))
          : [],
        suggestedFollowups: Array.isArray(data.suggested_followups)
          ? data.suggested_followups.map((f: string) => formatCleanText(f))
          : [],
        sources: Array.isArray(data.sources) ? data.sources : [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setHistory((prev) => [newDoubt, ...prev]);
      retrySubmissionRef.current = null;
      if (query === submission.query && attachedFile === submission.attachedFile) {
        setQuery('');
        setAttachedFile(null);
      }
    } catch (err: any) {
      console.warn('[DoubtSolver] Failed to solve doubt:', err);
      setErrorMessage(getDoubtErrorMessage(err));
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        canGoBack
        title="AI Doubt Solver"
        subtitle={subject === 'Auto-Detect' ? 'Multimodal AI • Any Question or Diagram' : `${subject}${chapter ? ` • ${chapter}` : ''}`}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Subject Context Bar (Optional) */}
          <View style={[styles.contextCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
            <View style={styles.contextHeader}>
              <MaterialIcons name="auto-awesome" size={18} color={colors.primary} />
              <Text style={[styles.contextTitle, { color: colors.onSurface }]}>SUBJECT / CONTEXT (OPTIONAL)</Text>
            </View>

            {/* Subject Selector Pills */}
            <View style={styles.pillsRow}>
              {['Auto-Detect', 'Physics', 'Chemistry', 'Biology', 'Mathematics'].map((s) => {
                const isSelected = subject === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: isSelected ? colors.primaryFixed : colors.surfaceContainerLow,
                        borderColor: isSelected ? colors.primary : colors.borderHairline,
                      },
                    ]}
                    onPress={() => {
                      setSubject(s);
                      if (s === 'Auto-Detect') setChapter('');
                    }}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color: isSelected ? colors.onPrimaryFixedVariant : colors.onSurfaceVariant,
                          fontFamily: isSelected ? 'PlusJakartaSans_700Bold' : 'PlusJakartaSans_500Medium',
                        },
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Doubt Input Card */}
          <View style={[styles.inputCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
            <TextInput
              style={[styles.queryInput, { color: colors.onSurface }]}
              placeholder={`Ask any doubt, or attach an image / PDF above...\ne.g. "Explain the derivation of Carnot engine efficiency"`}
              placeholderTextColor={colors.outline}
              multiline
              numberOfLines={4}
              value={query}
              onChangeText={setQuery}
            />

            {/* Attached File Preview Card */}
            {attachedFile && (
              <View
                style={[
                  styles.attachedPreviewCard,
                  {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant,
                  },
                ]}
              >
                {attachedFile.type === 'image' ? (
                  <Image
                    source={{ uri: attachedFile.uri }}
                    style={styles.previewThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.previewPdfIconBox, { backgroundColor: 'rgba(190, 84, 60, 0.12)' }]}>
                    <MaterialIcons name="picture-as-pdf" size={26} color={colors.primary} />
                  </View>
                )}

                <View style={styles.previewDetailsCol}>
                  <View style={styles.previewTitleRow}>
                    <Text
                      style={[styles.previewFileName, { color: colors.onSurface }]}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {attachedFile.name}
                    </Text>
                    <View
                      style={[
                        styles.previewTypeBadge,
                        {
                          backgroundColor:
                            attachedFile.type === 'pdf'
                              ? 'rgba(190, 84, 60, 0.15)'
                              : 'rgba(52, 103, 95, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.previewTypeBadgeText,
                          {
                            color:
                              attachedFile.type === 'pdf'
                                ? colors.primary
                                : colors.secondary,
                          },
                        ]}
                      >
                        {attachedFile.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.previewFileSize, { color: colors.onSurfaceVariant }]}>
                    {formatFileSize(attachedFile.size)} • Ready for AI solution
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.previewRemoveBtn, { backgroundColor: colors.surfaceContainerLowest }]}
                  onPress={handleClearAttachment}
                  activeOpacity={0.7}
                  accessibilityLabel="Remove attached file"
                >
                  <MaterialIcons name="close" size={16} color={colors.onSurface} />
                </TouchableOpacity>
              </View>
            )}

            {/* Action Bar */}
            <View style={[styles.inputActionBar, { borderTopColor: colors.borderHairline }]}>
              <View style={styles.attachButtonsGroup}>
                <TouchableOpacity
                  style={[styles.attachIconBtn, { backgroundColor: colors.surfaceContainerLow }]}
                  onPress={handlePickPDF}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="picture-as-pdf" size={18} color={colors.primary} />
                  <Text style={[styles.attachBtnLabel, { color: colors.onSurfaceVariant }]}>PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attachIconBtn, { backgroundColor: colors.surfaceContainerLow }]}
                  onPress={() => handlePickImage(false)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="photo-library" size={18} color={colors.secondary} />
                  <Text style={[styles.attachBtnLabel, { color: colors.onSurfaceVariant }]}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attachIconBtn, { backgroundColor: colors.surfaceContainerLow }]}
                  onPress={() => handlePickImage(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="photo-camera" size={18} color={colors.tertiary} />
                  <Text style={[styles.attachBtnLabel, { color: colors.onSurfaceVariant }]}>Camera</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
                ]}
                onPress={() => handleSubmit()}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <>
                    <Text style={[styles.submitBtnText, { color: colors.onPrimary }]}>Solve Doubt</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Error & Retry Banner */}
          {errorMessage && (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorContainer }]}>
              <MaterialIcons name="error-outline" size={20} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.errorBannerText, { color: colors.onErrorContainer }]}>{errorMessage}</Text>
                {errorMessage.toLowerCase().includes('permission') && (
                  <TouchableOpacity
                    onPress={() => router.push('/permissions' as any)}
                    style={{ marginTop: 4 }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12 }}>
                      Manage App Permissions →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleSubmit(undefined, retrySubmissionRef.current)}
                style={styles.retryBtn}
                disabled={loading}
              >
                <Text style={[styles.retryBtnText, { color: colors.error }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* AI Thinking Animation */}
          {loading && (
            <View style={[styles.thinkingCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.thinkingTitle, { color: colors.onSurface }]}>Retrieving RAG Knowledge...</Text>
              <Text style={[styles.thinkingSubtitle, { color: colors.onSurfaceVariant }]}>
                Scanning ChromaDB textbook chunks for {subject} ({chapter}) and generating step-by-step reasoning.
              </Text>
            </View>
          )}

          {/* Solutions History List */}
          {history.length > 0 ? (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyHeading, { color: colors.onSurface }]}>SOLVED EXPLANATIONS</Text>
                <Text style={[styles.historyCount, { color: colors.onSurfaceVariant }]}>{history.length} Doubts</Text>
              </View>

              {history.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.solutionCard,
                    { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline },
                  ]}
                >
                  {/* Query Header */}
                  <View style={styles.solutionHeader}>
                    <View style={styles.solutionTagRow}>
                      <View style={[styles.subjectTag, { backgroundColor: colors.primaryFixed }]}>
                        <Text style={[styles.subjectTagText, { color: colors.onPrimaryFixedVariant }]}>{item.subject}</Text>
                      </View>
                      <Text style={[styles.chapterTagInline, { color: colors.onSurfaceVariant }]}>{item.chapter}</Text>
                    </View>
                    <Text style={[styles.timestampText, { color: colors.outline }]}>{item.timestamp}</Text>
                  </View>

                  <Text style={[styles.solutionQueryTitle, { color: colors.onSurface }]}>"{item.query}"</Text>

                  {item.fileName && (
                    <View style={[styles.fileBadge, { backgroundColor: colors.surfaceContainerLow }]}>
                      <MaterialIcons name="attach-file" size={14} color={colors.onSurfaceVariant} />
                      <Text style={[styles.fileBadgeText, { color: colors.onSurfaceVariant }]}>{item.fileName}</Text>
                    </View>
                  )}

                  {/* Solution Body */}
                  <View style={[styles.answerBox, { backgroundColor: colors.surfaceContainerLow }]}>
                    <Text style={[styles.answerText, { color: colors.onSurface }]}>{formatCleanText(item.answer)}</Text>
                  </View>

                  {/* Key Takeaways */}
                  {item.keyTakeaways.length > 0 && (
                    <View style={styles.takeawaysSection}>
                      <Text style={[styles.takeawaysTitle, { color: colors.primary }]}>KEY TAKEAWAYS</Text>
                      {item.keyTakeaways.map((takeaway, idx) => (
                        <View key={idx} style={styles.takeawayRow}>
                          <MaterialIcons name="check-circle" size={14} color={colors.secondary} />
                          <Text style={[styles.takeawayText, { color: colors.onSurface }]}>{formatCleanText(takeaway)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Suggested Follow-Ups */}
                  {item.suggestedFollowups.length > 0 && (
                    <View style={styles.followupsSection}>
                      <Text style={[styles.followupsTitle, { color: colors.onSurfaceVariant }]}>TEST YOUR UNDERSTANDING</Text>
                      <View style={styles.followupsGroup}>
                        {item.suggestedFollowups.map((q, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[styles.followupBtn, { borderColor: colors.borderHairline, backgroundColor: colors.surfaceContainerLow }]}
                            onPress={() => {
                              setQuery(q);
                              handleSubmit(q);
                            }}
                          >
                            <MaterialIcons name="help-outline" size={15} color={colors.primary} />
                            <Text style={[styles.followupText, { color: colors.onSurface }]}>{formatCleanText(q)}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            !loading && (
              <View style={[styles.emptyStateCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.borderHairline }]}>
                <MaterialIcons name="psychology" size={48} color={colors.outline} />
                <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Ask Anything in Your Syllabus</Text>
                <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
                  Type a concept question or attach a textbook page/screenshot above. Our RAG engine answers with verified NCERT facts and step-by-step clarity.
                </Text>
              </View>
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  contextCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contextTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
  },
  chapterTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chapterTagText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  inputCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  queryInput: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 15,
    minHeight: 88,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  attachedPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 4,
  },
  previewThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#00000010',
  },
  previewPdfIconBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewDetailsCol: {
    flex: 1,
    gap: 3,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewFileName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    flex: 1,
  },
  previewTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewTypeBadgeText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  previewFileSize: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
  },
  previewRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
  },
  attachButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  attachBtnLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  errorBannerText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  thinkingCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  thinkingTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
  },
  thinkingSubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  historySection: {
    gap: 14,
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyHeading: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  historyCount: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  solutionCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  solutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  solutionTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectTagText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
  },
  chapterTagInline: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
  },
  timestampText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
  },
  solutionQueryTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    lineHeight: 22,
  },
  fileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  fileBadgeText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11,
  },
  answerBox: {
    padding: 14,
    borderRadius: 14,
  },
  answerText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  takeawaysSection: {
    gap: 6,
    paddingTop: 6,
  },
  takeawaysTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  takeawayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  takeawayText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  followupsSection: {
    gap: 8,
    paddingTop: 8,
  },
  followupsTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
  },
  followupsGroup: {
    gap: 6,
  },
  followupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  followupText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    flex: 1,
  },
  emptyStateCard: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
  },
  emptySubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
