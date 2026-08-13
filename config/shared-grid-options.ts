import { AG_GRID_LOCALE_CN } from '@ag-grid-community/locale';
import { type GridOptions, themeQuartz } from 'ag-grid-community';
import GridLoading from '~/components/grid/Loading.vue';
import GridNoRows from '~/components/grid/NoRows.vue';

// 创建自定义的中文本地化，覆盖 columns 键
const customLocaleText = {
  ...AG_GRID_LOCALE_CN,
  columns: '配置字段',
};

/**
 * Grid表格公共配置
 */
export const sharedGridOptions: GridOptions = {
  localeText: customLocaleText,
  rowNumbers: {
    resizable: true,
    minWidth: 64,
    maxWidth: 96,
  },
  loadingOverlayComponent: GridLoading,
  noRowsOverlayComponent: GridNoRows,
  sideBar: {
    toolPanels: [
      {
        id: 'columns',
        labelDefault: 'Columns',
        labelKey: 'columns',
        iconKey: 'columns',
        toolPanel: 'agColumnsToolPanel',
        minWidth: 225,
        maxWidth: 225,
        width: 225,
        toolPanelParams: {
          suppressRowGroups: true,
          suppressValues: true,
          suppressPivotMode: true,
        },
      },
    ],
    position: 'right',
  },
  enableCellTextSelection: true,
  tooltipShowDelay: 0,
  tooltipShowMode: 'whenTruncated',
  suppressContextMenu: true,
  defaultColDef: {
    sortable: true,
    filter: true,
    flex: 1,
    enableCellChangeFlash: false,
    suppressHeaderMenuButton: true,
    suppressHeaderContextMenu: true,
    enableValue: true,
    enableRowGroup: true,
  },
  selectionColumnDef: {
    sortable: true,
    width: 52,
    pinned: 'left',
  },
  rowSelection: {
    mode: 'multiRow',
    headerCheckbox: true,
    selectAll: 'filtered',
  },
  theme: themeQuartz.withParams({
    fontFamily: '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif', // 与全站中文字体栈一致
    fontSize: 13, // 正文降一档，实现紧凑感
    spacing: 6, // 收紧单元格内边距（默认 8）
    rowHeight: 36, // 紧凑行高（默认约 42）
    headerHeight: 40,
    headerBackgroundColor: '#f8fafc', // slate-50
    headerFontSize: 13,
    headerFontWeight: 600, // 默认 700 过重
    headerTextColor: '#475569', // slate-600
    borderColor: '#e2e8f0', // slate-200
    rowBorder: true,
    columnBorder: false, // 去竖向网格线噪音，只留行线
    borderRadius: 8,
    wrapperBorder: true,
    oddRowBackgroundColor: '#fafafc', // ≈ slate-2
    rowHoverColor: '#f1f5f9', // slate-100
    selectedRowBackgroundColor: '#eff6ff', // blue-50
    rangeSelectionBackgroundColor: '#dbeafe', // blue-100
    accentColor: '#2563eb', // blue-600，勾选框/焦点主色
    checkboxCheckedBackgroundColor: '#2563eb',
    focusShadow: '0 0 0 2px rgba(37, 99, 235, 0.35)',
  }),
};
