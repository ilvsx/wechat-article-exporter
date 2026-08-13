/**
 * 设计 token 单一源
 * @description 亮/暗色阶与 AG Grid 主题参数均从此文件取值，避免同一色值在
 * tailwind 配置与 AG Grid 参数中双写（改色只需改此处）
 */

// 中性色阶（亮色：Radix 式半透明色阶，用于亮色界面；暗色：Tailwind 默认 slate-50~950）
export const slateLight = {
  1: '#00005503',
  2: '#00005506',
  3: '#0000330f',
  4: '#00002d17',
  5: '#0009321f',
  6: '#00002f26',
  7: '#00062e32',
  8: '#00083046',
  9: '#00051d74',
  10: '#00071b7f',
  11: '#0007149f',
  12: '#000509e3',
} as const;

// 中性色（Tailwind 默认 slate 阶的常用值，供 AG Grid 等第三方组件使用）
export const slateNeutral = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
} as const;

// 主色（blue）
export const primary = {
  50: '#eff6ff',
  100: '#dbeafe',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
} as const;

// AG Grid 主题参数（亮色）
export const gridLightParams = {
  fontFamily: '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif',
  fontSize: 13,
  spacing: 6,
  rowHeight: 36,
  headerHeight: 40,
  headerBackgroundColor: slateNeutral[50],
  headerFontSize: 13,
  headerFontWeight: 600,
  headerTextColor: slateNeutral[600],
  borderColor: slateNeutral[200],
  rowBorder: true,
  columnBorder: false,
  borderRadius: 8,
  wrapperBorder: true,
  sidePanelBorder: true,
  oddRowBackgroundColor: '#fafafc',
  rowHoverColor: 'rgba(59, 130, 246, 0.07)',
  selectedRowBackgroundColor: primary[50],
  rangeSelectionBackgroundColor: primary[100],
  accentColor: primary[600],
  checkboxCheckedBackgroundColor: primary[600],
  focusShadow: '0 0 0 2px rgba(37, 99, 235, 0.35)',
} as const;

// AG Grid 主题参数（暗色）
export const gridDarkParams = {
  accentColor: primary[500],
  backgroundColor: slateNeutral[900],
  headerBackgroundColor: slateNeutral[900],
  borderColor: slateNeutral[800],
  foregroundColor: slateNeutral[200],
  headerTextColor: slateNeutral[400],
  oddRowBackgroundColor: 'rgba(148, 163, 184, 0.03)',
  rowHoverColor: 'rgba(148, 163, 184, 0.08)',
  selectedRowBackgroundColor: 'rgba(37, 99, 235, 0.16)',
  rangeSelectionBackgroundColor: 'rgba(37, 99, 235, 0.24)',
  checkboxCheckedBackgroundColor: primary[500],
  focusShadow: '0 0 0 2px rgba(59, 130, 246, 0.35)',
} as const;
