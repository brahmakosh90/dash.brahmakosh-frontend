import { ref, onMounted, computed } from 'vue';
import api from '../../services/api.js';
import { useToast } from 'vue-toastification';

const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '20px', height: '20px' }}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
);

const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '20px', height: '20px' }}>
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const IconVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '20px', height: '20px' }}>
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);

const IconAudio = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '20px', height: '20px' }}>
    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
  </svg>
);

const IconPdf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '20px', height: '20px' }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '20px', height: '20px' }}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '16px', height: '16px' }}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '14px', height: '14px' }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '14px', height: '14px' }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '14px', height: '14px' }}>
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '18px', height: '18px' }}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconEmpty = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" style={{ width: '56px', height: '56px' }}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const IconStorage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: '22px', height: '22px' }}>
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

export default {
  name: 'R2Browser',
  setup() {
    const toast = useToast();
    const loading = ref(false);
    const files = ref([]);
    const counts = ref({});
    const nextCursor = ref(null);
    const isTruncated = ref(false);
    const prefix = ref('');
    const filterType = ref('all');
    const previewFile = ref(null);
    const searchQuery = ref('');

    const r2Error = ref(null);
    const isS3OnlyMode = ref(false);

    const checkStorageModeAndFetch = async () => {
      try {
        const res = await api.request('/client/settings/storage-mode');
        if (res?.data?.storageMode === 's3_only') {
          isS3OnlyMode.value = true;
          return;
        }
      } catch (e) { /* ignore, proceed to fetch */ }
      fetchFiles();
    };

    const fetchFiles = async (cursor = null) => {
      try {
        loading.value = true;
        r2Error.value = null;
        const params = new URLSearchParams({ limit: 200 });
        if (prefix.value) params.append('prefix', prefix.value);
        if (cursor) params.append('cursor', cursor);
        const res = await api.request(`/client/settings/r2-browser?${params}`);
        if (res?.success) {
          files.value = cursor ? [...files.value, ...res.data.files] : res.data.files;
          counts.value = res.data.counts || {};
          nextCursor.value = res.data.nextCursor;
          isTruncated.value = res.data.isTruncated;
        } else {
          r2Error.value = res?.message || 'Failed to load R2 files';
        }
      } catch (e) {
        const msg = e?.responseData?.message || e?.message || '';
        if (e?.responseData?.storageMode === 's3_only' || msg.includes('S3 Only')) {
          isS3OnlyMode.value = true;
        } else {
          r2Error.value = msg || 'Failed to load R2 files';
        }
      } finally {
        loading.value = false;
      }
    };

    const filteredFiles = computed(() => {
      let list = files.value;
      if (filterType.value !== 'all') list = list.filter(f => f.type === filterType.value);
      if (searchQuery.value.trim()) {
        const q = searchQuery.value.toLowerCase();
        list = list.filter(f => f.key.toLowerCase().includes(q));
      }
      return list;
    });

    const formatSize = (bytes) => {
      if (!bytes) return '0 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const fileName = (key) => key.split('/').pop() || key;

    const typeConfig = (type) => {
      if (type === 'image') return { icon: <IconImage />, bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', label: 'IMAGE' };
      if (type === 'video') return { icon: <IconVideo />, bg: '#fdf4ff', border: '#e9d5ff', text: '#7c3aed', label: 'VIDEO' };
      if (type === 'audio') return { icon: <IconAudio />, bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', label: 'AUDIO' };
      if (type === 'pdf')   return { icon: <IconPdf />,   bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', label: 'PDF' };
      return { icon: <IconFolder />, bg: '#f9fafb', border: '#e5e7eb', text: '#374151', label: 'FILE' };
    };

    const downloadFile = (file) => {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = fileName(file.key);
      a.target = '_blank';
      a.click();
    };

    onMounted(() => checkStorageModeAndFetch());

    const StatCard = ({ label, count, icon, color, filterKey }) => (
      <div
        onClick={() => { filterType.value = filterKey; }}
        style={{
          background: '#fff',
          border: `2px solid ${filterType.value === filterKey ? color : '#e5e7eb'}`,
          borderRadius: '12px',
          padding: '16px 20px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minWidth: '110px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ color: filterType.value === filterKey ? color : '#9ca3af', display: 'flex' }}>{icon}</div>
        <div style={{ fontSize: '26px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{count || 0}</div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      </div>
    );

    return () => (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ color: '#6366f1' }}><IconStorage /></div>
          <h4 style={{ margin: 0, fontWeight: 800, fontSize: '20px', color: '#111827' }}>R2 Storage Browser</h4>
        </div>
        <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '14px' }}>Browse, preview and download all files stored in Cloudflare R2.</p>

        {/* Stat Cards */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <StatCard label="Total"  count={counts.value.total} icon={<IconBox />}    color="#6366f1" filterKey="all" />
          <StatCard label="Images" count={counts.value.image} icon={<IconImage />}  color="#1d4ed8" filterKey="image" />
          <StatCard label="Videos" count={counts.value.video} icon={<IconVideo />}  color="#7c3aed" filterKey="video" />
          <StatCard label="Audio"  count={counts.value.audio} icon={<IconAudio />}  color="#15803d" filterKey="audio" />
          <StatCard label="PDFs"   count={counts.value.pdf}   icon={<IconPdf />}    color="#c2410c" filterKey="pdf" />
          <StatCard label="Others" count={counts.value.other} icon={<IconFolder />} color="#374151" filterKey="other" />
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}><IconSearch /></span>
            <input
              type="text"
              placeholder="Search by filename..."
              value={searchQuery.value}
              onInput={(e) => { searchQuery.value = e.target.value; }}
              style={{ width: '100%', padding: '8px 14px 8px 36px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <input
            type="text"
            placeholder="Folder prefix (e.g. images/)"
            value={prefix.value}
            onInput={(e) => { prefix.value = e.target.value; }}
            style={{ flex: 1, minWidth: '180px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
          />
          <button
            onClick={() => fetchFiles()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
          >
            <IconSearch /> Search
          </button>
          <button
            onClick={() => { prefix.value = ''; searchQuery.value = ''; filterType.value = 'all'; fetchFiles(); }}
            style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6b7280' }}>
          Showing <strong>{filteredFiles.value.length}</strong> files
          {filterType.value !== 'all' && <span style={{ marginLeft: '4px' }}>— filtered: <strong>{filterType.value}</strong></span>}
        </div>

        {/* S3 Only Mode Notice */}
        {isS3OnlyMode.value && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>☁️</div>
            <h3 style={{ margin: '0 0 8px', color: '#374151', fontWeight: 700 }}>R2 Browser Unavailable</h3>
            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '14px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Current storage mode is <strong>S3 Only</strong>. R2 Browser only works when storage mode is set to <strong>R2 Only</strong> or <strong>Both</strong>.
            </p>
            <a
              href="/client/settings"
              style={{ display: 'inline-block', padding: '10px 24px', background: '#6366f1', color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}
            >
              Go to Storage Settings
            </a>
          </div>
        )}

        {/* Error Banner */}
        {r2Error.value && !loading.value && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', color: '#991b1b', fontSize: '14px' }}>
            <strong>R2 Error:</strong> {r2Error.value}
          </div>
        )}

        {/* Loading */}
        {loading.value && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading files from R2...
          </div>
        )}

        {/* Empty */}
        {!loading.value && filteredFiles.value.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><IconEmpty /></div>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#6b7280' }}>No files found</p>
            <p style={{ margin: 0, fontSize: '13px' }}>Upload files to R2 storage to see them here.</p>
          </div>
        )}

        {/* File Grid */}
        {!loading.value && filteredFiles.value.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
            {filteredFiles.value.map((file) => {
              const c = typeConfig(file.type);
              return (
                <div key={file.key} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Thumbnail */}
                  <div
                    onClick={() => { previewFile.value = file; }}
                    style={{ height: '130px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  >
                    {file.type === 'image' && file.url
                      ? <img src={file.url} alt={fileName(file.key)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      : <div style={{ color: c.text, opacity: 0.6, transform: 'scale(2.5)' }}>{c.icon}</div>
                    }
                    <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                      {c.label}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }} title={file.key}>
                      {fileName(file.key)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
                      {formatSize(file.size)} · {formatDate(file.lastModified)}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => { previewFile.value = file; }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 0', fontSize: '12px', fontWeight: 600, background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}
                      >
                        <IconEye /> View
                      </button>
                      <button
                        onClick={() => downloadFile(file)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 0', fontSize: '12px', fontWeight: 600, background: '#6366f1', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff' }}
                      >
                        <IconDownload /> Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {isTruncated.value && !loading.value && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => fetchFiles(nextCursor.value)}
              style={{ padding: '10px 32px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
            >
              Load More
            </button>
          </div>
        )}

        {/* Preview Modal */}
        {previewFile.value && (
          <div
            onClick={() => { previewFile.value = null; }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto', width: '700px' }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <div style={{ color: typeConfig(previewFile.value.type).text, flexShrink: 0 }}>{typeConfig(previewFile.value.type).icon}</div>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fileName(previewFile.value.key)}
                  </span>
                </div>
                <button onClick={() => { previewFile.value = null; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: '4px' }}>
                  <IconX />
                </button>
              </div>

              {/* Preview Content */}
              <div style={{ padding: '20px', textAlign: 'center', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previewFile.value.type === 'image' && (
                  <img src={previewFile.value.url} alt={fileName(previewFile.value.key)} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', objectFit: 'contain' }} />
                )}
                {previewFile.value.type === 'video' && (
                  <video controls src={previewFile.value.url} style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }} />
                )}
                {previewFile.value.type === 'audio' && (
                  <div style={{ width: '100%', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', color: '#15803d', transform: 'scale(3)' }}><IconAudio /></div>
                    <audio controls src={previewFile.value.url} style={{ width: '100%', marginTop: '24px' }} />
                  </div>
                )}
                {previewFile.value.type === 'pdf' && (
                  <iframe src={previewFile.value.url} style={{ width: '100%', height: '60vh', border: 'none', borderRadius: '8px' }} />
                )}
                {previewFile.value.type === 'other' && (
                  <div style={{ color: '#9ca3af' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', transform: 'scale(2.5)' }}><IconFolder /></div>
                    <p style={{ marginTop: '24px' }}>Preview not available for this file type.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {formatSize(previewFile.value.size)} · {formatDate(previewFile.value.lastModified)}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(previewFile.value.url); toast.success('URL copied!'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', color: '#374151' }}
                  >
                    <IconCopy /> Copy URL
                  </button>
                  <button
                    onClick={() => downloadFile(previewFile.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#6366f1', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', color: '#fff' }}
                  >
                    <IconDownload /> Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
};
