import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  type ListRenderItemInfo,
} from "react-native";
import type { NewsRow } from "@/types/news";
import { formatRelativeTime } from "@/utils/formatDate";
import { getCountryDisplayLabel } from "@/utils/countryNames";
import { useTheme } from "@/contexts/ThemeContext";

interface NewsCardProps {
  item: NewsRow;
}

export function NewsCard({ item }: NewsCardProps) {
  const { isDarkMode } = useTheme();
  const cardBg = isDarkMode ? "bg-gray-800" : "bg-white";
  const borderCls = isDarkMode ? "border-gray-700" : "border-slate-100";
  const titleCls = isDarkMode ? "text-white" : "text-slate-900";
  const summaryCls = isDarkMode ? "text-gray-300" : "text-slate-600";
  const metaCls = isDarkMode ? "text-gray-400" : "text-slate-500";

  const openLinkSafe = () => {
    if (!item.source_url) return;
    if (Platform.OS === "web" && typeof window !== "undefined" && window.open) {
      window.open(item.source_url, "_blank", "noopener,noreferrer");
    } else {
      Linking.openURL(item.source_url);
    }
  };

  return (
    <TouchableOpacity
      onPress={openLinkSafe}
      activeOpacity={0.85}
      accessibilityRole="link"
      accessibilityLabel={`Haber: ${item.title}`}
      className={`rounded-xl mx-4 mb-3 p-5 shadow-sm border ${cardBg} ${borderCls}`}
    >
      <View className="flex-row items-center mb-3 gap-1.5 flex-wrap">
        <Text className={`text-sm font-semibold tracking-wide leading-relaxed ${metaCls}`}>
          {getCountryDisplayLabel(item.country_code)}
        </Text>
        <Text className={`text-xs ${metaCls} mx-1`}>·</Text>
        <Text className={`text-xs leading-relaxed ${metaCls}`}>
          {formatRelativeTime(item.created_at)}
        </Text>
      </View>
      <Text
        className={`text-lg font-bold leading-relaxed mb-2 ${titleCls}`}
        numberOfLines={2}
      >
        {item.title}
      </Text>
      <Text className={`text-sm leading-relaxed ${summaryCls}`} numberOfLines={3}>
        {item.summary_tr}
      </Text>
    </TouchableOpacity>
  );
}

export function renderNewsCard({
  item,
}: ListRenderItemInfo<NewsRow>): React.ReactElement {
  return <NewsCard item={item} />;
}
