import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Camera, X, CheckCircle } from 'lucide-react';
import { db, addAuditLog, addStudentAndSync, updateStudentAndSync } from '../db/database';
import type { Student } from '../types';
import { CLASSES, SECTIONS, SESSIONS, STATES } from '../types';

const EMPTY: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
  studentName: '', scholarNumber: '', admissionNumber: '',
  class: '', section: '', academicSession: '2025-26',
  dateOfBirth: '', gender: 'Male', category: undefined, bloodGroup: undefined,
  fatherName: '', motherName: '', parentMobile: '', alternateMobile: '',
  penNumber: '', apaarId: '', sssmId: '',
  fullAddress: '', village: '', district: '', state: 'Madhya Pradesh', pincode: '',
  admissionDate: new Date().toISOString().split('T')[0],
  status: 'Active', remarks: '', photo: undefined,
};

type FormErrors = Partial<Record<keyof Student, string>>;

export default function StudentForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (isEdit) {
      db.students.get(Number(id)).then(s => {
        if (s) {
          const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = s;
          setForm(rest);
        }
      });
    }
  }, [id, isEdit]);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.studentName.trim()) e.studentName = 'Student name is required';
    if (!form.scholarNumber.trim()) e.scholarNumber = 'Scholar number is required';
    if (!form.class) e.class = 'Class is required';
    if (!form.fatherName.trim()) e.fatherName = "Father's name is required";
    if (!form.parentMobile.trim()) e.parentMobile = 'Parent mobile is required';
    else if (!/^\d{10}$/.test(form.parentMobile)) e.parentMobile = 'Must be 10 digits';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    if (!form.admissionDate) e.admissionDate = 'Admission date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) { setTab(0); return; }
    setSaving(true);

    try {
      if (isEdit) {
        const existing = await db.students.get(Number(id));
        const changes = Object.entries(form)
          .filter(([k, v]) => existing?.[k as keyof Student] !== v)
          .map(([k, v]) => `${k}: ${existing?.[k as keyof Student]} → ${v}`)
          .join('; ');
        await updateStudentAndSync(Number(id), { ...form, updatedAt: new Date().toISOString() });
        await addAuditLog('Updated', 'Student', form.studentName, 'Student record updated', changes, id);
      } else {
        // Check duplicate scholar number
        const exists = await db.students.where('scholarNumber').equals(form.scholarNumber).first();
        if (exists) {
          setErrors({ scholarNumber: 'This scholar number already exists' });
          setSaving(false);
          setTab(0);
          return;
        }
        const newId = await addStudentAndSync({
          ...form,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await addAuditLog('Added', 'Student', form.studentName, 'New student added', undefined, String(newId));
      }
      setSuccess(true);
      setTimeout(() => navigate(isEdit ? `/students/${id}` : '/students'), 1500);
    } catch {
      setSaving(false);
    }
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('photo', ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const tabs = ['Basic Info', 'Parent Info', 'Govt IDs', 'Address', 'School Info'];

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            Student {isEdit ? 'Updated' : 'Added'} Successfully!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Student' : 'Add New Student'}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Fill in all required fields</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                {form.photo ? (
                  <img src={form.photo} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              {form.photo && (
                <button type="button" onClick={() => set('photo', undefined)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student Photo</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">JPG, PNG up to 2MB</p>
              <button type="button" onClick={() => photoRef.current?.click()}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                Upload Photo
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
            {tabs.map((t, i) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(i)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === i ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Student Name *" error={errors.studentName}>
                  <input value={form.studentName} onChange={e => set('studentName', e.target.value)} className={input(errors.studentName)} placeholder="Full name" />
                </Field>
                <Field label="Scholar Number *" error={errors.scholarNumber}>
                  <input value={form.scholarNumber} onChange={e => set('scholarNumber', e.target.value)} className={input(errors.scholarNumber)} placeholder="Unique scholar number" />
                </Field>
                <Field label="Admission Number" error={errors.admissionNumber}>
                  <input value={form.admissionNumber} onChange={e => set('admissionNumber', e.target.value)} className={input()} placeholder="Admission number" />
                </Field>
                <Field label="Class *" error={errors.class}>
                  <select value={form.class} onChange={e => set('class', e.target.value)} className={input(errors.class)}>
                    <option value="">Select Class</option>
                    {CLASSES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Section">
                  <select value={form.section} onChange={e => set('section', e.target.value)} className={input()}>
                    <option value="">Select Section</option>
                    {SECTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Academic Session">
                  <select value={form.academicSession} onChange={e => set('academicSession', e.target.value)} className={input()}>
                    {SESSIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Date of Birth *" error={errors.dateOfBirth}>
                  <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={input(errors.dateOfBirth)} />
                </Field>
                <Field label="Gender *" error={errors.gender}>
                  <select value={form.gender} onChange={e => set('gender', e.target.value as Student['gender'])} className={input()}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Category">
                  <select value={form.category || ''} onChange={e => set('category', e.target.value as Student['category'])} className={input()}>
                    <option value="">Select Category</option>
                    {['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Blood Group">
                  <select value={form.bloodGroup || ''} onChange={e => set('bloodGroup', e.target.value as Student['bloodGroup'])} className={input()}>
                    <option value="">Select Blood Group</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
              </div>
            )}

            {tab === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Father's Name *" error={errors.fatherName}>
                  <input value={form.fatherName} onChange={e => set('fatherName', e.target.value)} className={input(errors.fatherName)} placeholder="Father's full name" />
                </Field>
                <Field label="Mother's Name">
                  <input value={form.motherName} onChange={e => set('motherName', e.target.value)} className={input()} placeholder="Mother's full name" />
                </Field>
                <Field label="Parent Mobile *" error={errors.parentMobile}>
                  <input value={form.parentMobile} onChange={e => set('parentMobile', e.target.value)} className={input(errors.parentMobile)} placeholder="10-digit mobile number" maxLength={10} />
                </Field>
                <Field label="Alternate Mobile">
                  <input value={form.alternateMobile || ''} onChange={e => set('alternateMobile', e.target.value)} className={input()} placeholder="Alternate number" maxLength={10} />
                </Field>
              </div>
            )}

            {tab === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="PEN Number">
                  <input value={form.penNumber || ''} onChange={e => set('penNumber', e.target.value)} className={input()} placeholder="Permanent Education Number" />
                </Field>
                <Field label="APAAR ID">
                  <input value={form.apaarId || ''} onChange={e => set('apaarId', e.target.value)} className={input()} placeholder="Academic Bank of Credits ID" />
                </Field>
                <Field label="SSSM ID">
                  <input value={form.sssmId || ''} onChange={e => set('sssmId', e.target.value)} className={input()} placeholder="Samagra Social Security Mission ID" />
                </Field>
              </div>
            )}

            {tab === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="Full Address">
                    <textarea value={form.fullAddress || ''} onChange={e => set('fullAddress', e.target.value)} className={input() + ' resize-none'} rows={2} placeholder="House no, street, locality..." />
                  </Field>
                </div>
                <Field label="Village / City">
                  <input value={form.village || ''} onChange={e => set('village', e.target.value)} className={input()} placeholder="Village or city name" />
                </Field>
                <Field label="District">
                  <input value={form.district || ''} onChange={e => set('district', e.target.value)} className={input()} placeholder="District" />
                </Field>
                <Field label="State">
                  <select value={form.state || ''} onChange={e => set('state', e.target.value)} className={input()}>
                    <option value="">Select State</option>
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Pincode">
                  <input value={form.pincode || ''} onChange={e => set('pincode', e.target.value)} className={input()} placeholder="6-digit pincode" maxLength={6} />
                </Field>
              </div>
            )}

            {tab === 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Admission Date *" error={errors.admissionDate}>
                  <input type="date" value={form.admissionDate} onChange={e => set('admissionDate', e.target.value)} className={input(errors.admissionDate)} />
                </Field>
                <Field label="Status">
                  <select value={form.status} onChange={e => set('status', e.target.value as Student['status'])} className={input()}>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>TC Issued</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Remarks">
                    <textarea value={form.remarks || ''} onChange={e => set('remarks', e.target.value)} className={input() + ' resize-none'} rows={3} placeholder="Any remarks or notes..." />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-between px-5 pb-4">
            <button
              type="button"
              onClick={() => setTab(t => Math.max(0, t - 1))}
              disabled={tab === 0}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 text-gray-600 dark:text-gray-300 transition-colors"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-1">
              {tabs.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === tab ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
              ))}
            </div>
            {tab < tabs.length - 1 ? (
              <button type="button" onClick={() => setTab(t => t + 1)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Next →
              </button>
            ) : (
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : isEdit ? 'Update Student' : 'Add Student'}
              </button>
            )}
          </div>
        </div>

        {/* Quick Save always visible */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 font-medium">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEdit ? 'Update Student' : 'Add Student'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function input(error?: string) {
  return `w-full px-3 py-2 text-sm rounded-lg border transition-colors outline-none
    ${error
      ? 'border-red-400 bg-red-50 dark:bg-red-900/10 dark:border-red-700 text-gray-900 dark:text-white'
      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800'
    }`;
}
