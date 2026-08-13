import dayjs from 'dayjs';
import type { IndexableType, IndexableTypeArrayReadonly } from 'dexie';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import ConfirmModal from '~/components/modal/Confirm.vue';
import toastFactory from '~/composables/toast';
import { db } from '~/store/v2/db';

const BACKUP_USEFOR = 'wechat-article-exporter-backup';
const BACKUP_VERSION = 1;

interface BackupManifest {
  usefor: string;
  version: number;
  exportedAt: number;
  tables: { name: string; count: number }[];
}

interface TableDump {
  name: string;
  keys: IndexableType[];
  rows: Record<string, unknown>[];
}

interface BlobPlaceholder {
  __blob__: string;
}

function isBlobPlaceholder(value: unknown): value is BlobPlaceholder {
  return typeof value === 'object' && value !== null && '__blob__' in value;
}

/**
 * 整库备份/恢复
 * @description 将 IndexedDB 全部表导出为 zip(Blob 字段单独存文件)，支持一键恢复
 */
export function useBackup() {
  const toast = toastFactory();
  const modal = useModal();

  const exporting = ref(false);
  const importing = ref(false);

  async function exportBackup() {
    exporting.value = true;
    try {
      const zip = new JSZip();
      const tables = db.tables.map(table => table.name);
      const manifest: BackupManifest = {
        usefor: BACKUP_USEFOR,
        version: BACKUP_VERSION,
        exportedAt: Date.now(),
        tables: [],
      };

      for (const name of tables) {
        const table = db.table(name);
        const keys = await table.toCollection().primaryKeys();
        const rows = await table.bulkGet(keys);

        const dump: TableDump = { name, keys: [], rows: [] };
        rows.forEach((row, index) => {
          if (!row) return;
          const sanitized: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            if (value instanceof Blob) {
              // Blob 字段单独存为 zip 文件，行内留占位引用
              const path = `blobs/${name}/${index}/${key}`;
              zip.file(path, value);
              sanitized[key] = { __blob__: path };
            } else {
              sanitized[key] = value;
            }
          }
          dump.keys.push(keys[index]);
          dump.rows.push(sanitized);
        });

        zip.file(`tables/${name}.json`, JSON.stringify(dump));
        manifest.tables.push({ name, count: dump.rows.length });
      }

      zip.file('manifest.json', JSON.stringify(manifest));
      const blob = await zip.generateAsync({ type: 'blob' });
      const filename = `wechat-article-exporter-backup-${dayjs().format('YYYYMMDD-HHmmss')}.zip`;
      saveAs(blob, filename);

      const totalCount = manifest.tables.reduce((sum, table) => sum + table.count, 0);
      toast.success('备份成功', `已导出 ${tables.length} 张表，共 ${totalCount} 条记录`);
    } catch (e) {
      toast.error('备份失败', e instanceof Error ? e.message : String(e));
    } finally {
      exporting.value = false;
    }
  }

  async function importBackup(file: File) {
    modal.open(ConfirmModal, {
      title: '确认导入备份？',
      description: '导入将清空当前全部本地数据（文章、正文、留言、阅读量等），并替换为备份内容。建议先导出当前数据。',
      async onConfirm() {
        importing.value = true;
        try {
          const zip = await JSZip.loadAsync(file);
          const manifestFile = zip.file('manifest.json');
          if (!manifestFile) {
            throw new Error('备份文件缺少 manifest.json');
          }
          const manifest = JSON.parse(await manifestFile.async('text')) as BackupManifest;
          if (manifest.usefor !== BACKUP_USEFOR || manifest.version !== BACKUP_VERSION) {
            throw new Error('备份文件格式不正确');
          }

          // 清空所有表
          await db.transaction('rw', db.tables, async () => {
            for (const table of db.tables) {
              await table.clear();
            }
          });

          // 逐表恢复（跳过当前数据库不存在的表，兼容备份版本差异）
          for (const { name } of manifest.tables) {
            if (!db.tables.some(table => table.name === name)) continue;
            const dumpFile = zip.file(`tables/${name}.json`);
            if (!dumpFile) continue;
            const dump = JSON.parse(await dumpFile.async('text')) as TableDump;

            const rows: Record<string, unknown>[] = [];
            for (const row of dump.rows) {
              const restored: Record<string, unknown> = {};
              for (const [key, value] of Object.entries(row)) {
                if (isBlobPlaceholder(value)) {
                  const blobFile = zip.file(value.__blob__);
                  restored[key] = blobFile ? await blobFile.async('blob') : null;
                } else {
                  restored[key] = value;
                }
              }
              rows.push(restored);
            }
            if (rows.length > 0) {
              const table = db.table<Record<string, unknown>, IndexableType>(name);
              if (table.schema.primKey.keyPath) {
                // inbound key 表:主键来自行内字段(url/fakeid 等),传 keys 会抛错
                await table.bulkPut(rows);
              } else {
                // outbound key 表:主键在行外(article 的 fakeid:aid 等),必须回传备份的 keys
                await table.bulkPut(rows, dump.keys as IndexableTypeArrayReadonly);
              }
            }
          }

          toast.success('恢复完成', `已恢复 ${manifest.tables.length} 张表的数据，可前往各页面查看`);
        } catch (e) {
          toast.error('恢复失败', e instanceof Error ? e.message : String(e));
        } finally {
          importing.value = false;
        }
      },
    });
  }

  return {
    exporting,
    importing,
    exportBackup,
    importBackup,
  };
}
