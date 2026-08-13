import { AG_GRID_LOCALE_CN } from '@ag-grid-community/locale';
import { colorSchemeDark, type GridOptions, themeQuartz } from 'ag-grid-community';
import GridLoading from '~/components/grid/Loading.vue';
import GridNoRows from '~/components/grid/NoRows.vue';
import { gridDarkParams, gridLightParams } from '~/config/ui-tokens';

// 创建自定义的中文本地化，覆盖 columns 键
const customLocaleText = {
  ...AG_GRID_LOCALE_CN,
  columns: '配置字段',
};

// 亮色主题（参数见 config/ui-tokens.ts，与 design tokens 同源）
export const lightGridTheme = themeQuartz.withParams(gridLightParams);

// 暗色主题（slate-900 底 + 亮色前景）
export const darkGridTheme = themeQuartz.withPart(colorSchemeDark).withParams(gridDarkParams);

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
    width: 40,
    pinned: 'left',
  },
  rowSelection: {
    mode: 'multiRow',
    headerCheckbox: true,
    // 表头勾选仅作用于当前分页(未分页时等价于全部行)
    selectAll: 'currentPage',
  },
  theme: lightGridTheme,
};
