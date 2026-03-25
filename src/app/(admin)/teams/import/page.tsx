'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Upload, FileSpreadsheet, Download, Loader2,
  CheckCircle2, XCircle, AlertTriangle, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import apiClient from '@/lib/apiClient';

// ─── Types ──────────────────────────────────────────────────
interface EventOption { id: string; eventName: string; status: string; }

interface ParsedRow {
  rowNumber: number;
  teamName: string;
  projectTitle: string;
  department: string;
  collegeName: string;
  projectDescription?: string;
  domain?: string;
  githubUrl?: string;
  memberName: string;
  memberEmail?: string;
  memberPhone?: string;
  memberName2?: string;
  memberEmail2?: string;
  memberName3?: string;
  memberName4?: string;
  errors: string[];
  isDuplicate: boolean;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
}

// ─── CSV Column Mapping ─────────────────────────────────────
const CSV_COLUMNS = [
  'teamName', 'projectTitle', 'department', 'collegeName',
  'projectDescription', 'domain', 'githubUrl',
  'memberName', 'memberEmail', 'memberPhone',
  'memberName2', 'memberEmail2', 'memberName3', 'memberName4',
] as const;

const REQUIRED_COLUMNS = ['teamName', 'projectTitle', 'department', 'collegeName', 'memberName'];

const SAMPLE_CSV = `teamName,projectTitle,department,collegeName,projectDescription,domain,githubUrl,memberName,memberEmail,memberPhone,memberName2,memberEmail2,memberName3,memberName4
AlgoX,AI Code Review,CSE,VJIT,AI-powered pull request reviewer,AI/ML,https://github.com/algox,Alice Johnson,alice@vjit.ac.in,9876543210,Bob Smith,bob@vjit.ac.in,Charlie Lee,
ByteHackers,Collaborative IDE,CSE,VJIT,Real-time browser IDE,Web Dev,,Dave Wilson,dave@vjit.ac.in,,Eve Adams,,Frank Liu,Grace Kim`;

// ─── Helpers ────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if ((ch === ',' || ch === '\t') && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(current.trim());
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

function validateRow(row: Record<string, string>, rowNumber: number, teamNameSet: Set<string>): ParsedRow {
  const errors: string[] = [];
  for (const col of REQUIRED_COLUMNS) {
    if (!row[col]?.trim()) errors.push(`Missing required field: ${col}`);
  }
  const isDuplicate = teamNameSet.has(row.teamName?.trim().toLowerCase());
  if (isDuplicate) errors.push('Duplicate team name in this batch');
  if (row.githubUrl && !/^https?:\/\/.+/.test(row.githubUrl)) errors.push('Invalid GitHub URL');

  return {
    rowNumber,
    teamName: row.teamName || '',
    projectTitle: row.projectTitle || '',
    department: row.department || '',
    collegeName: row.collegeName || '',
    projectDescription: row.projectDescription,
    domain: row.domain,
    githubUrl: row.githubUrl,
    memberName: row.memberName || '',
    memberEmail: row.memberEmail,
    memberPhone: row.memberPhone,
    memberName2: row.memberName2,
    memberEmail2: row.memberEmail2,
    memberName3: row.memberName3,
    memberName4: row.memberName4,
    errors,
    isDuplicate,
  };
}

// ─── Component ──────────────────────────────────────────────
export default function TeamImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Step: upload → preview → result
  type Step = 'upload' | 'preview' | 'result';
  const [step, setStep] = useState<Step>('upload');

  // ─── Load events ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setEventsLoading(true);
      try {
        const { data } = await apiClient.get('/events?limit=50');
        const list: EventOption[] = (data.data ?? []).map((e: { id: string; eventName: string; status: string }) => ({
          id: e.id, eventName: e.eventName, status: e.status,
        }));
        setEvents(list);
        if (list.length > 0) setSelectedEventId(list[0].id);
      } catch { toast.error('Failed to load events'); }
      finally { setEventsLoading(false); }
    })();
  }, []);

  // ─── Handle file ──────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv') && !file.name.endsWith('.txt')) {
      toast.error('Please upload a CSV file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large (max 2MB)');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast.error('CSV must have a header row and at least one data row');
        return;
      }

      const header = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      // Map headers to our column names
      const colMap: Record<string, number> = {};
      for (let i = 0; i < header.length; i++) {
        const h = header[i];
        // Fuzzy match common patterns
        if (h.includes('teamname') || h === 'team') colMap['teamName'] = i;
        else if (h.includes('projecttitle') || h === 'project') colMap['projectTitle'] = i;
        else if (h.includes('department') || h === 'dept') colMap['department'] = i;
        else if (h.includes('college') || h === 'collegename') colMap['collegeName'] = i;
        else if (h.includes('description')) colMap['projectDescription'] = i;
        else if (h === 'domain') colMap['domain'] = i;
        else if (h.includes('github')) colMap['githubUrl'] = i;
        else if (h === 'membername' || h === 'leadername' || h === 'member1') colMap['memberName'] = i;
        else if (h === 'memberemail' || h === 'leaderemail' || h === 'email1') colMap['memberEmail'] = i;
        else if (h === 'memberphone' || h === 'leaderphone' || h === 'phone1') colMap['memberPhone'] = i;
        else if (h === 'membername2' || h === 'member2') colMap['memberName2'] = i;
        else if (h === 'memberemail2' || h === 'email2') colMap['memberEmail2'] = i;
        else if (h === 'membername3' || h === 'member3') colMap['memberName3'] = i;
        else if (h === 'membername4' || h === 'member4') colMap['memberName4'] = i;
        else {
          // Direct match by CSV_COLUMNS
          const match = CSV_COLUMNS.find(c => c.toLowerCase() === h);
          if (match && !(match in colMap)) colMap[match] = i;
        }
      }

      const teamNameSet = new Set<string>();
      const parsed: ParsedRow[] = [];

      for (let r = 1; r < rows.length; r++) {
        const dataRow = rows[r];
        const rowObj: Record<string, string> = {};
        for (const [col, idx] of Object.entries(colMap)) {
          rowObj[col] = dataRow[idx] ?? '';
        }
        const validated = validateRow(rowObj, r, teamNameSet);
        if (rowObj.teamName?.trim()) teamNameSet.add(rowObj.teamName.trim().toLowerCase());
        parsed.push(validated);
      }

      setParsedRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  // ─── Drag and drop ────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ─── Download sample ──────────────────────────────────────
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reviewflow_team_import_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Remove row ───────────────────────────────────────────
  const removeRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Import ───────────────────────────────────────────────
  const handleImport = async () => {
    if (!selectedEventId) { toast.error('Select an event'); return; }
    const validRows = parsedRows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) { toast.error('No valid rows to import'); return; }

    setImporting(true);
    try {
      const { data } = await apiClient.post('/teams/import', {
        eventId: selectedEventId,
        rows: validRows.map(r => ({
          teamName: r.teamName,
          projectTitle: r.projectTitle,
          department: r.department,
          collegeName: r.collegeName,
          projectDescription: r.projectDescription || undefined,
          domain: r.domain || undefined,
          githubUrl: r.githubUrl || undefined,
          memberName: r.memberName,
          memberEmail: r.memberEmail || undefined,
          memberPhone: r.memberPhone || undefined,
          memberName2: r.memberName2 || undefined,
          memberEmail2: r.memberEmail2 || undefined,
          memberName3: r.memberName3 || undefined,
          memberName4: r.memberName4 || undefined,
        })),
      });
      setImportResult(data.data);
      setStep('result');
      toast.success(`Imported ${data.data.success} of ${data.data.total} teams`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Import failed';
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  // ─── Stats ────────────────────────────────────────────────
  const validCount = parsedRows.filter(r => r.errors.length === 0).length;
  const errorCount = parsedRows.filter(r => r.errors.length > 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/teams')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Import Teams</h1>
          <p className="text-sm text-gray-500">Upload a CSV file to bulk-import teams into an event</p>
        </div>
      </div>

      {/* Event Selector */}
      {eventsLoading ? (
        <Skeleton className="h-10 w-full max-w-md" />
      ) : events.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-gray-400">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />No events found. Create an event first.
        </CardContent></Card>
      ) : (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">Import into:</label>
          <Select value={selectedEventId} onValueChange={(v) => setSelectedEventId(v ?? '')}>
            <SelectTrigger className="max-w-md h-10">
              <SelectValue placeholder="Select event" />
            </SelectTrigger>
            <SelectContent>
              {events.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.eventName} <span className="text-xs text-gray-400 ml-1">({e.status})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ─── STEP: UPLOAD ─── */}
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Sample download */}
            <div className="flex items-center gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={downloadSample} className="gap-2">
                <Download className="w-4 h-4" />Download Sample CSV
              </Button>
              <span className="text-xs text-gray-400">Use this template to format your data</span>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-[#1A56DB] bg-blue-50 dark:bg-blue-950/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-[#1A56DB]' : 'text-gray-300 dark:text-gray-600'}`} />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {dragOver ? 'Drop your CSV here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-gray-400">CSV files up to 2MB · Max 500 teams per import</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Column reference */}
            <Card className="mt-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Required Columns</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {CSV_COLUMNS.map(col => (
                    <Badge key={col} variant={REQUIRED_COLUMNS.includes(col) ? 'default' : 'secondary'} className="text-xs">
                      {col}{REQUIRED_COLUMNS.includes(col) && ' *'}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── STEP: PREVIEW ─── */}
        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* File info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#1A56DB]" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{fileName}</span>
                <Badge variant="secondary">{parsedRows.length} rows</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setParsedRows([]); setStep('upload'); setFileName(''); }} className="gap-1.5 text-gray-400">
                <Trash2 className="w-3.5 h-3.5" />Clear
              </Button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-[#1A56DB]">{parsedRows.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-green-600">{validCount}</p>
                <p className="text-xs text-gray-500">Valid</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${errorCount > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                <p className={`text-xl font-bold ${errorCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{errorCount}</p>
                <p className="text-xs text-gray-500">Errors</p>
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-10">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Team</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Project</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Dept</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">College</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Leader</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">Status</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-gray-100 dark:border-gray-800 ${
                            row.errors.length > 0 ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-gray-400 text-xs">{row.rowNumber}</td>
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 max-w-[120px] truncate">{row.teamName || '—'}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{row.projectTitle || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{row.department || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{row.collegeName || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{row.memberName || '—'}</td>
                          <td className="px-3 py-2">
                            {row.errors.length > 0 ? (
                              <div className="group relative">
                                <Badge variant="destructive" className="text-[10px] cursor-help">
                                  {row.errors.length} error{row.errors.length > 1 ? 's' : ''}
                                </Badge>
                                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 shadow-lg min-w-[200px]">
                                  {row.errors.map((e, j) => (
                                    <p key={j} className="text-xs text-red-600 dark:text-red-400">{e}</p>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">Valid</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" onClick={() => { setStep('upload'); setParsedRows([]); setFileName(''); }}>
                <ArrowLeft className="w-4 h-4 mr-1" />Upload Different File
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0 || !selectedEventId}
                className="gap-2 bg-[#1A56DB] hover:bg-[#1044A5] min-w-[160px]"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {importing ? 'Importing...' : `Import ${validCount} Teams`}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── STEP: RESULT ─── */}
        {step === 'result' && importResult && (
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="p-8 text-center">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
                ) : (
                  <AlertTriangle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Import Complete</h2>
                <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mt-4 mb-6">
                  <div><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{importResult.total}</p><p className="text-xs text-gray-500">Total</p></div>
                  <div><p className="text-2xl font-bold text-green-600">{importResult.success}</p><p className="text-xs text-gray-500">Success</p></div>
                  <div><p className={`text-2xl font-bold ${importResult.failed > 0 ? 'text-red-600' : 'text-gray-400'}`}>{importResult.failed}</p><p className="text-xs text-gray-500">Failed</p></div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="text-left max-w-md mx-auto mb-6">
                    <p className="text-sm font-medium text-red-600 mb-2">Failed rows:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {importResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-gray-600 dark:text-gray-400 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded">
                          Row {e.row}: {e.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => { setStep('upload'); setParsedRows([]); setFileName(''); setImportResult(null); }}>
                    Import More
                  </Button>
                  <Button onClick={() => router.push('/teams')} className="bg-[#1A56DB] hover:bg-[#1044A5]">
                    View Teams
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
