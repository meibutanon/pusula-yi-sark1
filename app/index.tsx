import { useState, useMemo, useRef, useEffect } from "react";
import {
  FlatList,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  useWindowDimensions,
  Modal,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNews } from "@/hooks/useNews";
import { useTheme } from "@/contexts/ThemeContext";
import { NewsCard } from "@/components/NewsCard";
import { getAllCountryCodes } from "@/config/newsSources";
import { getCountryDisplayLabel } from "@/utils/countryNames";
import { stripMarkdownFromSummary } from "@/utils/stripMarkdown";
import { getLocalTimeZone } from "@/utils/formatDate";
import type { NewsRow } from "@/types/news";

const ALL_COUNTRIES = "All";

/** summary_tr içinden "Yönetici Özeti" ve "Bu Neden Önemli?" bölümlerini ayırır (Markdown/şık gösterim için). */
function parseSummarySections(summary: string | undefined): { executiveSummary: string; whyItMatters: string } | null {
  const cleaned = stripMarkdownFromSummary(summary);
  if (!cleaned) return null;
  const whyMarker = "Bu Neden Önemli?";
  const idx = cleaned.indexOf(whyMarker);
  if (idx === -1) return null;
  const firstPart = cleaned.slice(0, idx).trim();
  const secondPart = cleaned.slice(idx + whyMarker.length).replace(/^[:\s*]+/, "").trim();
  const execMarker = "Yönetici Özeti";
  const execIdx = firstPart.indexOf(execMarker);
  const executiveSummary = execIdx >= 0
    ? firstPart.slice(execIdx + execMarker.length).replace(/^[:\s*]+/, "").trim()
    : firstPart;
  if (!executiveSummary && !secondPart) return null;
  return { executiveSummary: executiveSummary || secondPart, whyItMatters: secondPart };
}

function filterNews(
  news: NewsRow[],
  searchQuery: string,
  selectedCountry: string
): NewsRow[] {
  let result = news;
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.summary_tr.toLowerCase().includes(q)
    );
  }
  if (selectedCountry !== ALL_COUNTRIES) {
    result = result.filter(
      (item) => item.country_code.toUpperCase() === selectedCountry.toUpperCase()
    );
  }
  return result;
}

const LOGO_ASPECT = 380 / 150;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 640;
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"haberler" | "raporlar">("haberler");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(ALL_COUNTRIES);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsRow | null>(null);

  const logoMaxWidth = Math.min(380, screenWidth - 40);
  const logoHeight = logoMaxWidth / LOGO_ASPECT;

  useEffect(() => {
    setLocationLabel("Dünya Geneli");
  }, []);

  useEffect(() => {
    setSelectedCountry(ALL_COUNTRIES);
  }, [activeTab]);
  
  const handleRefresh = async () => {
    setLastCheckedAt(new Date());
    setTick((t) => t + 1);
    try {
      await refetch();
    } catch (e) {
      if (__DEV__) console.warn("Yenileme hatası:", e);
    }
  };

  const userTimeZone = getLocalTimeZone();
  const lastCheckLabel = lastCheckedAt
    ? lastCheckedAt.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: userTimeZone,
      })
    : "--";

  const reportsOnly = activeTab === "raporlar";
  const countryFilter = selectedCountry === ALL_COUNTRIES ? undefined : selectedCountry;
  const {
    data: news = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useNews(reportsOnly, countryFilter);

  const filteredNews = useMemo(
    () => filterNews(news, searchQuery, selectedCountry),
    [news, searchQuery, selectedCountry]
  );

  /* Her iki sekmede de aynı ülke butonları (Tümü + JP, KR, AU vb.). Raporlar sekmesinde ekstra "Stratejik Raporlar" pill gösterme. */
  const countryCodes = useMemo(() => getAllCountryCodes(), []);
  const countryScrollRef = useRef<ScrollView>(null);

  const headerBg = "bg-slate-950";
  const headerInputBg = "bg-slate-800/60 border border-slate-700/50";
  const pillSelected = "bg-white";
  const pillUnselected = "bg-slate-800/80 border border-slate-600/50";
  const pillTextSelected = "text-slate-900 font-semibold text-sm";
  const pillTextUnselected = "text-slate-200 font-medium text-sm";

  const todayLabel = new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: userTimeZone,
  });

  const filterInputBg = "bg-slate-800/60 border border-slate-700/50";
  const iconColor = "#e2e8f0";
  const iconMuted = "#94a3b8";

  const listHeaderComponent = (
    <View className={headerBg}>
      {/* Üst satır: Logo + Asya-Pasifik (sol) | Canlı Akış + Saat + İkonlar (sağ). Masaüstü space-between, mobil flex-wrap. */}
      <View
        className={`px-5 pt-5 pb-4 flex-row items-center justify-between ${isNarrow ? "flex-wrap gap-3" : ""}`}
      >
        <View className={`flex-row items-center ${isNarrow ? "w-full" : ""}`} style={{ gap: 8 }}>
          <View
            className="logo-wrap"
            style={{
              maxWidth: logoMaxWidth,
              width: isNarrow ? "100%" : logoMaxWidth,
              height: logoHeight,
              backgroundColor: "transparent",
              overflow: "hidden",
            }}
          >
            <Image
              source={require("../assets/logo-seffaf.png.png")}
              resizeMode="contain"
              style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
              accessibilityLabel="Pusula-yı Şark logosu"
            />
          </View>
          <View
            style={{
              width: 1,
              height: 40,
              backgroundColor: "rgba(148, 163, 184, 0.5)",
              marginHorizontal: 12,
              alignSelf: "center",
            }}
          />
          <Text className="text-slate-300 text-xl font-medium tracking-wide shrink-0">
            Asya-Pasifik Haber Ağı
          </Text>
        </View>
        <View className={`flex-row items-center flex-wrap gap-2 ${isNarrow ? "w-full justify-end" : "shrink-0"}`}>
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <Text className="text-white font-sans text-sm font-medium tracking-wide">Canlı Akış</Text>
          </View>
          <Text className="text-slate-400 text-sm">Son: {lastCheckLabel}</Text>
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Bildirimler", "Pusula-yı Şark bildirimlerini başarıyla açtınız!")
              }
              className="w-9 h-9 rounded-lg items-center justify-center"
              accessibilityLabel="Abonelik"
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={20} color={iconMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleTheme}
              className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-600/50 items-center justify-center"
              accessibilityLabel={isDarkMode ? "Açık tema" : "Koyu tema"}
              accessibilityRole="button"
            >
              <Ionicons name={isDarkMode ? "sunny" : "moon"} size={18} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Arama çubuğunun hemen üstü: yan yana iki büyük sekme butonu */}
      <View className="px-5 pb-5">
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setActiveTab("haberler")}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: activeTab === "haberler" ? 4 : 0,
              borderBottomColor: "#fbbf24",
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "haberler" }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: activeTab === "haberler" ? "700" : "500",
                color: activeTab === "haberler" ? "#fbbf24" : "#94a3b8",
              }}
            >
              Son Dakika (Haberler)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("raporlar")}
            style={{
              flex: 1,
              paddingVertical: 14,
              paddingHorizontal: 12,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: activeTab === "raporlar" ? 4 : 0,
              borderBottomColor: "#fbbf24",
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "raporlar" }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: activeTab === "raporlar" ? "700" : "500",
                color: activeTab === "raporlar" ? "#fbbf24" : "#94a3b8",
              }}
            >
              Stratejik Raporlar
            </Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center gap-2 mb-4">
          <View className={`flex-1 flex-row items-center rounded-lg pl-3 pr-2 py-2.5 ${filterInputBg}`}>
            <Ionicons name="search" size={18} color={iconMuted} />
            <TextInput
              className="flex-1 ml-2.5 text-[15px] text-white"
              placeholder="Haber ara..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={handleRefresh}
              className="w-9 h-9 rounded-lg items-center justify-center"
              accessibilityLabel="Yenile"
              accessibilityRole="button"
              disabled={isRefetching}
            >
              {isRefetching ? (
                <ActivityIndicator size="small" color={iconColor} />
              ) : (
                <Ionicons name="refresh" size={18} color={iconColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={() => countryScrollRef.current?.scrollTo({ x: 0, animated: true })}
            className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600/50 items-center justify-center shrink-0"
            accessibilityLabel="Listeyi sola kaydır"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color={iconColor} />
          </TouchableOpacity>
          <ScrollView
            ref={countryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingLeft: 8, paddingRight: 24 }}
            className="flex-1"
          >
            <TouchableOpacity
              onPress={() => setSelectedCountry(ALL_COUNTRIES)}
              className={`px-4 py-2.5 rounded-full flex-row items-center ${
                selectedCountry === ALL_COUNTRIES ? pillSelected : pillUnselected
              }`}
            >
              <Text
                className={
                  selectedCountry === ALL_COUNTRIES ? pillTextSelected : pillTextUnselected
                }
              >
                Tümü
              </Text>
            </TouchableOpacity>
            {countryCodes.map((code) => {
              const isSelected = selectedCountry === code;
              return (
                <TouchableOpacity
                  key={code}
                  onPress={() => setSelectedCountry(code)}
                  className={`px-4 py-2.5 rounded-full flex-row items-center gap-1.5 ${
                    isSelected ? pillSelected : pillUnselected
                  }`}
                >
                  <Text className={isSelected ? pillTextSelected : pillTextUnselected}>
                    {getCountryDisplayLabel(code)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            onPress={() => countryScrollRef.current?.scrollToEnd({ animated: true })}
            className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-600/50 items-center justify-center shrink-0"
            accessibilityLabel="Listeyi sağa kaydır"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-forward" size={22} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const screenBg = isDarkMode ? "bg-gray-900" : "bg-stone-50";
  const loadingColor = isDarkMode ? "#e2e8f0" : "#0f172a";

  if (isLoading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${screenBg}`}
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color={loadingColor} />
        <Text className={`mt-3 text-base ${isDarkMode ? "text-gray-400" : "text-stone-500"}`}>
          Haberler yükleniyor...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        className={`flex-1 items-center justify-center px-6 ${screenBg}`}
        style={{ paddingTop: insets.top }}
      >
        <Text className={`text-lg font-bold mb-2 ${isDarkMode ? "text-white" : "text-stone-900"}`}>
          Yüklenemedi
        </Text>
        <Text className={isDarkMode ? "text-gray-400 text-center" : "text-stone-500 text-center"}>
          {error?.message ?? "Bilinmeyen hata"}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className={`flex-1 ${screenBg}`}
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-1">
        {isRefetching && (
          <View
            className="absolute inset-0 z-10 justify-center items-center bg-slate-950/60"
            pointerEvents="none"
          >
            <View className="bg-slate-800 rounded-xl px-6 py-4 items-center">
              <ActivityIndicator size="large" color="#e2e8f0" />
              <Text className="text-white text-base font-semibold mt-3">
                Yeni haberler aranıyor...
              </Text>
            </View>
          </View>
        )}

        {/* Haber detay modal: başlık + özet, kaynağa git butonu, kapat */}
        <Modal
          visible={selectedNewsItem !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedNewsItem(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1 justify-center items-center bg-black/60 px-4"
            onPress={() => setSelectedNewsItem(null)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              className={`w-full max-w-md rounded-2xl overflow-hidden shadow-xl ${
                isDarkMode ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
              }`}
              style={{ maxHeight: "85%" }}
            >
              <View className="p-5 pb-4">
                <View className="flex-row justify-between items-start gap-3">
                  <Text
                    className={`flex-1 text-lg font-bold leading-snug ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {selectedNewsItem?.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedNewsItem(null)}
                    className="w-9 h-9 rounded-full items-center justify-center bg-slate-200/80 dark:bg-slate-700/80"
                    accessibilityLabel="Kapat"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={22} color={isDarkMode ? "#e2e8f0" : "#475569"} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  className="mt-4 max-h-56"
                  showsVerticalScrollIndicator={true}
                >
                  {(() => {
                    const sections = parseSummarySections(selectedNewsItem?.summary_tr);
                    const bodyCls = isDarkMode ? "text-gray-300" : "text-slate-600";
                    const headingCls = isDarkMode ? "text-slate-100" : "text-slate-800";
                    if (sections) {
                      return (
                        <View className="gap-4">
                          <View>
                            <Text className={`text-sm font-bold uppercase tracking-wide mb-1.5 ${headingCls}`}>
                              Yönetici Özeti
                            </Text>
                            <Text className={`text-base leading-relaxed ${bodyCls}`}>
                              {sections.executiveSummary}
                            </Text>
                          </View>
                          {sections.whyItMatters ? (
                            <View>
                              <Text className={`text-sm font-bold uppercase tracking-wide mb-1.5 ${headingCls}`}>
                                Bu Neden Önemli?
                              </Text>
                              <Text className={`text-base leading-relaxed ${bodyCls}`}>
                                {sections.whyItMatters}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    }
                    return (
                      <Text className={`text-base leading-relaxed ${bodyCls}`}>
                        {stripMarkdownFromSummary(selectedNewsItem?.summary_tr)}
                      </Text>
                    );
                  })()}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => {
                    if (selectedNewsItem?.source_url) {
                      if (Platform.OS === "web" && typeof window !== "undefined" && window.open) {
                        window.open(selectedNewsItem.source_url, "_blank", "noopener,noreferrer");
                      } else {
                        Linking.openURL(selectedNewsItem.source_url);
                      }
                    }
                  }}
                  className="mt-5 py-3.5 rounded-xl bg-slate-900 dark:bg-slate-700 items-center"
                  accessibilityLabel="Haberin kaynağına git"
                  accessibilityRole="button"
                >
                  <Text className="text-white font-semibold text-base">
                    Haberin Kaynağına Git
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <FlatList
          data={filteredNews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NewsCard item={item} onPress={setSelectedNewsItem} />
          )}
          ListHeaderComponent={listHeaderComponent}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isLoading}
              onRefresh={() => {
                setLastCheckedAt(new Date());
                refetch();
              }}
              tintColor={isDarkMode ? "#e2e8f0" : "#0f172a"}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 min-h-[280px] justify-center items-center px-6">
              <Text
                className={`text-center text-lg font-semibold ${
                  isRefetching ? "text-slate-400" : isDarkMode ? "text-gray-400" : "text-stone-500"
                }`}
              >
                {isRefetching
                  ? "Yeni haberler aranıyor..."
                  : searchQuery || selectedCountry !== ALL_COUNTRIES
                    ? "Bu filtreye uygun haber yok"
                    : "Henüz haber yok"}
              </Text>
              {isRefetching && (
                <ActivityIndicator
                  size="large"
                  color={isDarkMode ? "#94a3b8" : "#64748b"}
                  style={{ marginTop: 16 }}
                />
              )}
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}
