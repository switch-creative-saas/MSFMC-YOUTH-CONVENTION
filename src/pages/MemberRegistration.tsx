import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import churchLogo from '@/assets/church-logo.png';
import youthLogo from '@/assets/youth-logo.png';
import { useAppData } from '@/contexts/AppDataContext';
import { useToast } from '@/contexts/ToastContext';
import { BAND_COLORS, BAND_LIST, BRANCH_LIST, DEPARTMENT_LIST, GROUP_COLORS } from '@/types';
import type { Department, FellowshipBand, Member } from '@/types';

const steps = ['Identity', 'Church', 'First timer', 'Tag'];
const GROUPS = ['Group A', 'Group B', 'Group C', 'Group D'];

type FormState = {
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: 'Male' | 'Female' | '';
  dateOfBirth: string;
  address: string;
  occupation: string;
  emergencyContact: string;
  churchBranch: string;
  profilePhoto: string;
  fellowshipBand: FellowshipBand | '';
  departments: Department[];
  isFirstTimer: boolean | null;
  wantsPermanentMembership: boolean | null;
};

const initialForm: FormState = {
  fullName: '',
  phoneNumber: '',
  email: '',
  gender: '',
  dateOfBirth: '',
  address: '',
  occupation: '',
  emergencyContact: '',
  churchBranch: BRANCH_LIST[0],
  profilePhoto: '',
  fellowshipBand: '',
  departments: [],
  isFirstTimer: null,
  wantsPermanentMembership: null,
};

function formatRegistrationDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(new Date(value));
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 2) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  words.forEach(word => {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line) lines.push(line);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let lastLine = visibleLines[visibleLines.length - 1] ?? '';
    while (lastLine.length > 1 && context.measureText(`${lastLine}...`).width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    visibleLines[visibleLines.length - 1] = `${lastLine.trim()}...`;
  }

  visibleLines.forEach((item, index) => context.fillText(item, x, y + index * lineHeight));
}

function setFittedFont(context: CanvasRenderingContext2D, weight: number, size: number, family: string, text: string, maxWidth: number, minSize = 24) {
  let nextSize = size;
  do {
    context.font = `${weight} ${nextSize}px ${family}`;
    if (context.measureText(text).width <= maxWidth || nextSize <= minSize) break;
    nextSize -= 2;
  } while (nextSize >= minSize);
}

function drawInfoBlock(context: CanvasRenderingContext2D, label: string, value: string, x: number, y: number, maxWidth: number) {
  context.fillStyle = '#475569';
  context.font = '700 24px Inter, Arial, sans-serif';
  context.fillText(label.toUpperCase(), x, y);
  context.fillStyle = '#0f172a';
  context.font = '800 31px Inter, Arial, sans-serif';
  drawWrappedText(context, value || '-', x, y + 43, maxWidth, 36, 2);
}

async function createTagImage(member: Member, qrSvg: SVGSVGElement | null) {
  const canvas = document.createElement('canvas');
  canvas.width = 1040;
  canvas.height = 1560;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Unable to create tag image.');

  const qrData = qrSvg
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(qrSvg))}`
    : '';
  const imagePromises = [
    loadCanvasImage(youthLogo),
    loadCanvasImage(churchLogo),
    member.profilePhoto ? loadCanvasImage(member.profilePhoto) : Promise.resolve(null),
    qrData ? loadCanvasImage(qrData) : Promise.resolve(null),
  ] as const;

  const [youth, church, photo, qr] = await Promise.all(imagePromises);
  const groupColor = GROUP_COLORS[member.conventionGroup];
  const safeDepartments = member.departments.join(', ') || 'None';

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const sideGradient = context.createLinearGradient(0, 0, 0, canvas.height);
  sideGradient.addColorStop(0, '#a0bb38');
  sideGradient.addColorStop(0.55, '#d9bd73');
  sideGradient.addColorStop(1, '#e6c47a');
  context.fillStyle = sideGradient;
  context.fillRect(898, 0, 142, canvas.height);
  context.fillStyle = '#f04b23';
  context.beginPath();
  context.moveTo(1040, 1315);
  context.lineTo(1040, 1560);
  context.lineTo(890, 1560);
  context.closePath();
  context.fill();

  context.drawImage(youth, 70, 58, 142, 118);
  context.drawImage(church, 792, 50, 130, 130);

  context.fillStyle = '#075d8c';
  context.font = '900 58px Poppins, Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('Youth Convention', 520, 140);
  context.fillStyle = '#475569';
  context.font = '700 22px Inter, Arial, sans-serif';
  context.fillText('MOSYF 2026 ACCESS TAG', 520, 178);

  context.save();
  context.beginPath();
  context.arc(446, 482, 228, 0, Math.PI * 2);
  context.fillStyle = '#e5f7ff';
  context.fill();
  context.lineWidth = 24;
  context.strokeStyle = groupColor;
  context.stroke();
  context.clip();
  if (photo) {
    drawCoverImage(context, photo, 218, 254, 456, 456);
  }
  context.restore();

  roundedRect(context, 704, 378, 158, 150, 24);
  context.fillStyle = groupColor;
  context.fill();
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.font = '800 20px Poppins, Arial, sans-serif';
  context.fillText('ASSIGNED', 783, 426);
  context.font = '900 86px Poppins, Arial, sans-serif';
  context.fillText(member.conventionGroup.replace('Group ', ''), 783, 508);

  context.fillStyle = '#000000';
  context.textAlign = 'left';
  setFittedFont(context, 900, 72, 'Poppins, Arial, sans-serif', member.fullName.toUpperCase(), 760, 46);
  drawWrappedText(context, member.fullName.toUpperCase(), 92, 812, 760, 76, 2);

  const bandLabel = member.fellowshipBand.toUpperCase();
  context.font = '800 34px Inter, Arial, sans-serif';
  const bandWidth = Math.min(390, Math.max(210, context.measureText(bandLabel).width + 52));
  roundedRect(context, 92, 986, bandWidth, 64, 10);
  context.fillStyle = '#000000';
  context.fill();
  context.fillStyle = '#ffffff';
  context.fillText(bandLabel, 118, 1029);

  drawInfoBlock(context, 'Department', safeDepartments, 92, 1134, 510);
  drawInfoBlock(context, 'ID number', member.id, 92, 1262, 510);

  context.fillStyle = '#f8fafc';
  roundedRect(context, 628, 1060, 230, 340, 24);
  context.fill();
  context.strokeStyle = '#e2e8f0';
  context.lineWidth = 2;
  context.stroke();
  drawInfoBlock(context, 'Group', member.conventionGroup, 656, 1124, 174);
  drawInfoBlock(context, 'Registered', formatRegistrationDate(member.registeredAt), 656, 1248, 174);

  if (qr) {
    context.fillStyle = '#ffffff';
    roundedRect(context, 682, 1306, 132, 132, 16);
    context.fill();
    context.drawImage(qr, 696, 1320, 104, 104);
  }

  return canvas.toDataURL('image/png');
}

async function sendRegistrationConfirmation(member: Member, tagImageUrl: string) {
  const endpoint = import.meta.env.VITE_CONFIRMATION_EMAIL_ENDPOINT as string | undefined;

  if (!endpoint) {
    throw new Error('Set VITE_CONFIRMATION_EMAIL_ENDPOINT to send confirmation emails with tag attachments.');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: member.email,
      subject: `MOSYF 2026 registration confirmation - ${member.id}`,
      member: {
        id: member.id,
        fullName: member.fullName,
        email: member.email,
        fellowshipBand: member.fellowshipBand,
        conventionGroup: member.conventionGroup,
        departments: member.departments,
        registeredAt: member.registeredAt,
      },
      attachment: {
        filename: `${member.id}-convention-tag.png`,
        contentType: 'image/png',
        dataUrl: tagImageUrl,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Confirmation email failed with status ${response.status}.`);
  }
}

export function MemberRegistration() {
  const { addMember, members } = useAppData();
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<Member | null>(null);
  const [emailingMemberId, setEmailingMemberId] = useState('');
  const tagRef = useRef<HTMLDivElement>(null);

  const normalizedEmail = form.email.trim().toLowerCase();
  const emailExists = normalizedEmail
    ? members.some(member => member.email.trim().toLowerCase() === normalizedEmail)
    : false;

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handlePhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 720;
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext('2d');

        if (!context) {
          update('profilePhoto', String(reader.result));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        update('profilePhoto', canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const toggleDepartment = (department: Department) => {
    setForm(prev => {
      if (department === 'None') {
        return { ...prev, departments: prev.departments.includes('None') ? [] : ['None'] };
      }

      const withoutNone = prev.departments.filter(item => item !== 'None');
      const departments = withoutNone.includes(department)
        ? withoutNone.filter(item => item !== department)
        : [...withoutNone, department];

      return { ...prev, departments };
    });
  };

  const validateStep = () => {
    const nextErrors: Record<string, string> = {};

    if (step === 0) {
      if (!form.profilePhoto) nextErrors.profilePhoto = 'Upload a clear photo for the convention tag.';
      if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
      if (!form.phoneNumber.trim()) nextErrors.phoneNumber = 'Phone number is required.';
      if (!form.email.trim()) nextErrors.email = 'Email address is required.';
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.';
      if (emailExists) nextErrors.email = 'This email has already been used to register.';
      if (!form.gender) nextErrors.gender = 'Select gender.';
      if (!form.dateOfBirth) nextErrors.dateOfBirth = 'Date of birth is required.';
      if (!form.address.trim()) nextErrors.address = 'Address is required.';
      if (!form.occupation.trim()) nextErrors.occupation = 'Occupation or school is required.';
      if (!form.emergencyContact.trim()) nextErrors.emergencyContact = 'Emergency contact is required.';
    }

    if (step === 1) {
      if (!form.fellowshipBand) nextErrors.fellowshipBand = 'Select a fellowship band.';
      if (!form.churchBranch) nextErrors.churchBranch = 'Select a church branch.';
      if (form.departments.length === 0) nextErrors.departments = 'Select at least one department or None.';
    }

    if (step === 2) {
      if (form.isFirstTimer === null) nextErrors.isFirstTimer = 'Select an option.';
      if (form.isFirstTimer && form.wantsPermanentMembership === null) {
        nextErrors.wantsPermanentMembership = 'Select a permanent membership response.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep(current => Math.min(current + 1, steps.length - 1));
  };

  const previous = () => setStep(current => Math.max(current - 1, 0));

  const submit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);

    try {
      const member = addMember({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        email: normalizedEmail,
        gender: form.gender as 'Male' | 'Female',
        dateOfBirth: form.dateOfBirth,
        address: form.address.trim(),
        occupation: form.occupation.trim(),
        emergencyContact: form.emergencyContact.trim(),
        churchBranch: form.churchBranch,
        profilePhoto: form.profilePhoto,
        fellowshipBand: form.fellowshipBand as FellowshipBand,
        departments: form.departments.length ? form.departments : ['None'],
        isFirstTimer: form.isFirstTimer === true,
        wantsPermanentMembership: form.isFirstTimer ? form.wantsPermanentMembership : null,
      });

      setRegisteredMember(member);
      setEmailingMemberId(member.id);
      setStep(3);
      addToast({ type: 'success', title: 'Registration complete', description: `${member.id} has been generated. Preparing confirmation email...` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      setErrors({ email: message });
      setStep(0);
      addToast({ type: 'error', title: 'Registration failed', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTag = async () => {
    if (!tagRef.current || !registeredMember) return;

    try {
      const qrSvg = tagRef.current.querySelector('svg');
      const imageUrl = await createTagImage(registeredMember, qrSvg);
      const anchor = document.createElement('a');
      anchor.href = imageUrl;
      anchor.download = `${registeredMember.id}-convention-tag.png`;
      anchor.click();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Download failed',
        description: error instanceof Error ? error.message : 'Unable to generate image.',
      });
    }
  };

  useEffect(() => {
    if (!registeredMember || emailingMemberId !== registeredMember.id) return;

    let cancelled = false;

    const sendEmail = async () => {
      try {
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        const qrSvg = tagRef.current?.querySelector('svg') ?? null;
        const imageUrl = await createTagImage(registeredMember, qrSvg);
        if (cancelled) return;

        await sendRegistrationConfirmation(registeredMember, imageUrl);
        if (!cancelled) {
          setEmailingMemberId('');
          addToast({
            type: 'success',
            title: 'Confirmation email sent',
            description: `The convention tag was sent to ${registeredMember.email}.`,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setEmailingMemberId('');
          addToast({
            type: 'warning',
            title: 'Email not sent automatically',
            description: error instanceof Error ? error.message : 'Unable to send confirmation email.',
            duration: 7000,
          });
        }
      }
    };

    void sendEmail();

    return () => {
      cancelled = true;
    };
  }, [addToast, emailingMemberId, registeredMember]);

  const printTag = () => window.print();

  const inputClass = (field: keyof FormState) =>
    `glass-input w-full ${errors[field] ? 'border-red-500 ring-[3px] ring-red-500/15' : ''}`;

  return (
    <main className="min-h-screen bg-[#eef4f8] text-slate-950">
      <section className="no-print min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-2xl bg-[#083f63] p-6 text-white shadow-xl shadow-slate-900/15">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-[#083f63]">
                <BadgeCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">MOSYF 2026</p>
                <h1 className="text-2xl font-black leading-tight">Member Registration</h1>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {steps.map((label, index) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-full border ${index <= step ? 'border-white bg-white text-[#083f63]' : 'border-white/20 text-white/50'}`}>
                    {index < step ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={index <= step ? 'font-semibold text-white' : 'text-white/55'}>{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-xl border border-white/15 bg-white/10 p-4">
              <p className="text-sm text-white/75">Member IDs are generated as searchable QR-linked records for biometric check-in and convention attendance.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {GROUPS.map(group => (
                  <span key={group} className="rounded-lg bg-white/10 px-3 py-2">{group}</span>
                ))}
                <span className="rounded-lg bg-white px-3 py-2 font-semibold text-[#083f63]">Group E for None</span>
              </div>
            </div>
          </aside>

          <div className="rounded-2xl border border-white bg-white/80 p-4 shadow-xl shadow-slate-900/10 backdrop-blur sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="identity" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <Header icon={UserRound} title="Personal information" subtitle="These details will appear on the final convention tag." />

                  <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
                    <div>
                      <label className={`flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-slate-50 text-center transition ${errors.profilePhoto ? 'border-red-400' : 'border-slate-300 hover:border-[#083f63]'}`}>
                        {form.profilePhoto ? (
                          <img src={form.profilePhoto} alt="Uploaded member" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex flex-col items-center px-6 text-sm text-slate-500">
                            <Camera className="mb-3 h-10 w-10 text-[#083f63]" />
                            Upload a clear photo
                          </span>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={event => handlePhoto(event.target.files?.[0])} />
                      </label>
                      {errors.profilePhoto && <ErrorText>{errors.profilePhoto}</ErrorText>}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full Name" error={errors.fullName} className="sm:col-span-2">
                        <input className={inputClass('fullName')} value={form.fullName} onChange={event => update('fullName', event.target.value)} placeholder="Enter full name" />
                      </Field>
                      <Field label="Phone Number" error={errors.phoneNumber}>
                        <input className={inputClass('phoneNumber')} value={form.phoneNumber} onChange={event => update('phoneNumber', event.target.value)} placeholder="+234..." />
                      </Field>
                      <Field label="Email Address" error={errors.email}>
                        <input type="email" className={inputClass('email')} value={form.email} onChange={event => update('email', event.target.value)} placeholder="name@email.com" />
                      </Field>
                      <Field label="Gender" error={errors.gender}>
                        <div className="grid grid-cols-2 gap-2">
                          {(['Male', 'Female'] as const).map(gender => (
                            <SelectPill key={gender} selected={form.gender === gender} onClick={() => update('gender', gender)}>{gender}</SelectPill>
                          ))}
                        </div>
                      </Field>
                      <Field label="Date of Birth" error={errors.dateOfBirth}>
                        <input type="date" className={inputClass('dateOfBirth')} value={form.dateOfBirth} onChange={event => update('dateOfBirth', event.target.value)} />
                      </Field>
                      <Field label="Address" error={errors.address} className="sm:col-span-2">
                        <textarea className={`${inputClass('address')} min-h-24 py-3`} value={form.address} onChange={event => update('address', event.target.value)} placeholder="Residential address" />
                      </Field>
                      <Field label="Occupation/School" error={errors.occupation}>
                        <input className={inputClass('occupation')} value={form.occupation} onChange={event => update('occupation', event.target.value)} placeholder="Student, worker, school..." />
                      </Field>
                      <Field label="Emergency Contact" error={errors.emergencyContact}>
                        <input className={inputClass('emergencyContact')} value={form.emergencyContact} onChange={event => update('emergencyContact', event.target.value)} placeholder="Emergency phone number" />
                      </Field>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div key="church" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <Header icon={UsersRound} title="Fellowship and departments" subtitle="Animated glass cards make each selection clear before submission." />

                  <Field label="Which fellowship band do you belong to?" error={errors.fellowshipBand}>
                    <div className="grid gap-3 sm:grid-cols-5">
                      {BAND_LIST.map(band => (
                        <GlassChoice
                          key={band}
                          label={band}
                          selected={form.fellowshipBand === band}
                          color={BAND_COLORS[band]}
                          onClick={() => update('fellowshipBand', band)}
                        />
                      ))}
                    </div>
                  </Field>

                  <div className="mt-6">
                    <Field label="Church Branch" error={errors.churchBranch}>
                      <select className={inputClass('churchBranch')} value={form.churchBranch} onChange={event => update('churchBranch', event.target.value)}>
                        {BRANCH_LIST.map(branch => <option key={branch}>{branch}</option>)}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-6">
                    <Field label="Which department(s) do you serve in?" error={errors.departments}>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {DEPARTMENT_LIST.map(department => (
                          <GlassChoice
                            key={department}
                            label={department}
                            selected={form.departments.includes(department)}
                            color={department === 'None' ? '#64748b' : '#0f766e'}
                            onClick={() => toggleDepartment(department)}
                          />
                        ))}
                      </div>
                    </Field>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="first-timer" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  <Header icon={ShieldCheck} title="First timer details" subtitle="Permanent membership response is stored with the registration record." />

                  <Field label="Are you a first timer?" error={errors.isFirstTimer}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DecisionCard selected={form.isFirstTimer === true} title="Yes" description="This is my first time attending." onClick={() => update('isFirstTimer', true)} />
                      <DecisionCard selected={form.isFirstTimer === false} title="No" description="I have attended before." onClick={() => { update('isFirstTimer', false); update('wantsPermanentMembership', null); }} />
                    </div>
                  </Field>

                  <AnimatePresence>
                    {form.isFirstTimer === true && (
                      <motion.div className="mt-6" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                        <Field label="Would you like to become a permanent member of Mountain of Solution Youth Fellowship?" error={errors.wantsPermanentMembership}>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <DecisionCard selected={form.wantsPermanentMembership === true} title="Yes" description="Register me as a permanent member." onClick={() => update('wantsPermanentMembership', true)} />
                            <DecisionCard selected={form.wantsPermanentMembership === false} title="No" description="Convention registration only." onClick={() => update('wantsPermanentMembership', false)} />
                          </div>
                        </Field>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="tag" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
                  {registeredMember ? (
                    <>
                      <Header icon={BadgeCheck} title="Convention tag ready" subtitle="Download or print this tag immediately for convention access." />
                      <div className="grid gap-6 xl:grid-cols-[minmax(360px,520px)_1fr]">
                        <ConventionTag member={registeredMember} refProp={tagRef} />
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <h3 className="font-bold text-slate-950">Convention tag details</h3>
                            <div className="mt-4 grid gap-3 text-sm">
                              {[
                                ['Name', registeredMember.fullName],
                                ['Member ID', registeredMember.id],
                                ['Assigned group', registeredMember.conventionGroup],
                                ['Fellowship band', registeredMember.fellowshipBand],
                                ['Departments', registeredMember.departments.join(', ')],
                                ['Registration date', formatRegistrationDate(registeredMember.registeredAt)],
                              ].map(([label, value]) => (
                                <div key={label} className="grid gap-1 rounded-xl bg-white p-3 sm:grid-cols-[150px_1fr]">
                                  <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
                                  <span className="font-medium text-slate-900">{value || '-'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <button onClick={downloadTag} className="gradient-btn flex items-center justify-center gap-2">
                              <Download className="h-4 w-4" /> Download PNG
                            </button>
                            <button onClick={printTag} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
                              <Printer className="h-4 w-4" /> Print / Save PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                      <Header icon={BadgeCheck} title="Tag not generated yet" subtitle="Complete the registration details first so a member ID, group, QR code, and convention tag can be created." />
                      <button onClick={() => setStep(0)} className="gradient-btn">
                        Return to registration
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {step < 3 && (
              <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
                <button onClick={previous} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 ${step === 0 ? 'invisible' : ''}`}>
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                {step < 2 ? (
                  <button onClick={next} className="gradient-btn flex items-center gap-2">
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={submit} disabled={submitting} className="gradient-btn-green flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70">
                    {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
                    Complete Registration
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {registeredMember && (
        <section className="hidden print:block">
          <ConventionTag member={registeredMember} />
        </section>
      )}
    </main>
  );
}

function Header({ icon: Icon, title, subtitle }: { icon: typeof UserRound; title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f04b23] text-white">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs font-semibold text-red-600">{children}</p>;
}

function SelectPill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`h-12 rounded-xl border text-sm font-bold transition ${selected ? 'border-[#083f63] bg-[#083f63] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#083f63]'}`}>
      {children}
    </button>
  );
}

function GlassChoice({ label, selected, color, onClick }: { label: string; selected: boolean; color: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="relative min-h-24 overflow-hidden rounded-2xl border p-4 text-left shadow-sm backdrop-blur transition"
      style={{
        borderColor: selected ? color : 'rgba(148, 163, 184, 0.35)',
        background: selected ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'rgba(255,255,255,0.62)',
        color: selected ? '#fff' : '#0f172a',
      }}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10 flex items-center justify-between gap-3 text-sm font-black">
        {label}
        {selected && <Check className="h-4 w-4" />}
      </span>
      <span className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/20" />
      <span className="absolute bottom-3 left-4 h-1 w-12 rounded-full bg-current opacity-30" />
    </motion.button>
  );
}

function DecisionCard({ selected, title, description, onClick }: { selected: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${selected ? 'border-[#f04b23] bg-[#f04b23] text-white shadow-lg shadow-orange-500/20' : 'border-slate-200 bg-white text-slate-900 hover:border-[#f04b23]'}`}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="flex items-center justify-between text-lg font-black">
        {title}
        {selected && <Check className="h-5 w-5" />}
      </span>
      <span className={selected ? 'mt-2 block text-sm text-white/80' : 'mt-2 block text-sm text-slate-500'}>{description}</span>
    </motion.button>
  );
}

function ConventionTag({ member, refProp }: { member: Member; refProp?: React.RefObject<HTMLDivElement | null> }) {
  const groupColor = GROUP_COLORS[member.conventionGroup];
  const qrValue = `${window.location.origin}${window.location.pathname}#/qr/${member.id}`;

  return (
    <div ref={refProp} className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[30px] bg-white text-slate-950 shadow-2xl print:shadow-none" id="convention-tag">
      <div className="relative min-h-[780px] p-7">
        <div className="absolute inset-y-0 right-0 w-[74px] bg-[#d9bd73]" />
        <div className="absolute bottom-0 right-0 h-40 w-28 bg-[#f04b23]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
        <div className="absolute right-[24px] top-[420px] rotate-90 text-4xl font-black tracking-[0.28em] text-[#075d8c]">MOSYF</div>

        <div className="relative z-10">
          <div className="flex items-center justify-between pr-20">
            <img src={youthLogo} alt="Youth Fellowship logo" className="h-24 w-24 object-contain" />
            <div className="text-center text-[#075d8c]">
              <p className="text-4xl font-black leading-none">Youth Convention</p>
            </div>
            <img src={churchLogo} alt="Mountain of Solution logo" className="h-24 w-24 object-contain" />
          </div>

          <div className="mt-8 flex items-center justify-center gap-5 pr-20">
            <div className="relative grid h-64 w-64 shrink-0 place-items-center overflow-hidden rounded-full border-[14px] bg-[#e2f6ff]" style={{ borderColor: groupColor }}>
              {member.profilePhoto ? (
                <img src={member.profilePhoto} alt={member.fullName} className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-20 w-20 text-slate-300" />
              )}
            </div>
            <div className="rounded-2xl px-4 py-3 text-center text-white" style={{ background: groupColor }}>
              <p className="text-xs font-bold uppercase tracking-[0.18em]">Assigned</p>
              <p className="text-4xl font-black">{member.conventionGroup.replace('Group ', '')}</p>
            </div>
          </div>

          <div className="mt-8 pr-20">
            <p className="break-words text-5xl font-black uppercase leading-[0.95] tracking-normal">{member.fullName}</p>
          </div>

          <div className="mt-6 grid grid-cols-[1fr_132px] gap-5 pr-20">
            <div>
              <div className="inline-flex bg-black px-4 py-2 text-lg font-bold uppercase text-white">{member.fellowshipBand}</div>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-2xl font-medium text-slate-900">Department</p>
                <p className="text-xl font-black text-slate-950">{member.departments.join(', ')}</p>
                <p className="pt-3 text-xl font-medium text-slate-900">Registration date</p>
                <p className="text-lg font-bold text-slate-950">{formatRegistrationDate(member.registeredAt)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
              <QRCodeSVG value={qrValue} size={104} />
              <p className="mt-2 break-all font-mono text-[10px] font-bold">{member.id}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
