import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Theme } from '../constants/Theme';
import { useAppTheme } from '../context/ThemeContext';

interface Segment {
  label: string;
  percentage: number;
  count?: number;
  color: string;
}

interface DonutChartProps {
  total: number;
  totalLabel?: string;
  segments?: Segment[];
  size?: number;
  strokeWidth?: number;
}

export const defaultSegments: Segment[] = [
  { label: 'Conceptual', percentage: 32, count: 9, color: '#be543c' },
  { label: 'Time Pressure', percentage: 21, count: 6, color: '#375d92' },
  { label: 'Careless', percentage: 18, count: 5, color: '#34675f' },
  { label: 'Calculation', percentage: 15, count: 4, color: '#a13e28' },
  { label: 'Memory', percentage: 14, count: 4, color: '#822714' },
];

export const DonutChart: React.FC<DonutChartProps> = ({
  total = 28,
  totalLabel = 'Total',
  segments = defaultSegments,
  size = 140,
  strokeWidth = 14,
}) => {
  const { colors } = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.surfaceContainerHighest || colors.surfaceContainer}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Segment arcs */}
          {segments.map((segment, index) => {
            const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset;
            currentOffset += (segment.percentage / 100) * circumference;

            return (
              <Circle
                key={index}
                cx={center}
                cy={center}
                r={radius}
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </G>
      </Svg>

      <View style={styles.centerLabel}>
        <Text style={[styles.totalSubtext, { color: colors.onSurfaceVariant }]}>{totalLabel}</Text>
        <Text style={[styles.totalNumber, { color: colors.onSurface }]}>{total}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalSubtext: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalNumber: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    lineHeight: 26,
  },
});
