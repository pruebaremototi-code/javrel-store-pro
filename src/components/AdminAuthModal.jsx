import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Clock,
  Send,
} from 'lucide-react';
import { emailService } from '../services/emailService';
import { adminAuthService } from '../services/adminAuthService';
import { getPrimaryAdminEmail } from '../config/rbac';

const PRIMARY_EMAIL = getPrimaryAdminEmail();
const PRIMARY_PASSWORD = 'Soporte2026*';

const isPrimaryEmail = (email) =>
  String(email || '').trim().toLowerCase() === PRIMARY_EMAIL.toLowerCase();

export const AdminAuthModal = ({ isOpen, onClose, onAuthSuccess }) => {
  const [step, setStep] = useState(1); // 1: Credenciales, 2: Token OTP
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300);

  const otpInputRefs = useRef([]);
  const timerRef = useRef(null);

  // Limpiar campos cada vez que se abra el modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmail('');
      setPassword('');
      setOtpCode(['', '', '', '', '', '']);
      setErrorMsg('');
      setInfoMsg('');
      setIsLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  // Manejo del temporizador de 5 minutos en el Paso 2
  useEffect(() => {
    if (step === 2) {
      setRemainingSeconds(300);
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setErrorMsg('El token de verificación ha expirado. Por favor solicita uno nuevo.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Formato mm:ss para el temporizador
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Paso 1: el administrador principal usa 2FA; los colaboradores usan
  // Supabase Auth (o el modo local con PBKDF2) y cargan sus permisos.
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    const normalizedEmail = email.trim().toLowerCase();

    if (isPrimaryEmail(normalizedEmail)) {
      if (password !== PRIMARY_PASSWORD) {
        setErrorMsg('Credenciales inválidas o acceso no autorizado.');
        return;
      }

      setIsLoading(true);
      try {
        // Disparar envío real a la pasarela de correo (Resend / Vercel Serverless)
        const result = await emailService.sendOtp(normalizedEmail);
        setIsLoading(false);

        if (result.success) {
          setStep(2);
          setInfoMsg(
            result.message ||
              `¡Código de verificación enviado a ${PRIMARY_EMAIL}!`
          );
        } else {
          setErrorMsg(result.error || 'Error al comunicarse con el servidor de correo.');
        }
      } catch (err) {
        setIsLoading(false);
        setErrorMsg('Error al conectar con la pasarela de autenticación.');
      }
      return;
    }

    // Colaborador: validar correo + contraseña y cargar permisos RBAC.
    setIsLoading(true);
    try {
      const result = await adminAuthService.login(normalizedEmail, password);
      setIsLoading(false);

      if (result.success && result.session) {
        adminAuthService.saveSession(result.session);
        onAuthSuccess(result.session);
      } else {
        setErrorMsg(result.error || 'Credenciales inválidas o usuario sin perfil habilitado.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Error al conectar con el servicio de autenticación.');
    }
  };

  // Paso 2: Validar OTP y abrir sesión primaria (Supabase Auth o fallback local).
  // Se declara antes de `handleOtpChange` porque el autocompletado de 6 dígitos
  // la invoca de inmediato.
  const handleValidateOtp = async (codeToTest) => {
    setErrorMsg('');
    setIsLoading(true);

    try {
      const validation = emailService.verifyOtp(codeToTest);
      if (!validation.success) {
        setIsLoading(false);
        setErrorMsg(validation.error || 'Token inválido.');
        return;
      }

      const result = await adminAuthService.loginPrimary(email.trim().toLowerCase(), password);
      setIsLoading(false);

      if (result.success && result.session) {
        adminAuthService.saveSession(result.session);
        onAuthSuccess(result.session);
      } else {
        setErrorMsg(result.error || 'No se pudo abrir la sesión del administrador principal.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg('Error al validar la sesión del administrador principal.');
    }
  };

  // Manejar cambio en inputs de OTP
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    const nextOtp = [...otpCode];
    nextOtp[index] = value;
    setOtpCode(nextOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto submit cuando se completan los 6 dígitos
    const fullCode = nextOtp.join('');
    if (fullCode.length === 6) {
      handleValidateOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    setOtpCode(['', '', '', '', '', '']);

    const result = await emailService.sendOtp(PRIMARY_EMAIL);
    setIsLoading(false);

    if (result.success) {
      setRemainingSeconds(300);
      setInfoMsg(result.message || `Nuevo código enviado a ${PRIMARY_EMAIL}.`);
    } else {
      setErrorMsg('No fue posible reenviar el código. Intenta de nuevo.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera de Seguridad */}
        <div className="p-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0A6CFF]/10 text-[#0A6CFF] flex items-center justify-center border border-[#0A6CFF]/20 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Portal Privado Corporativo
              </h3>
              <p className="text-[11px] text-slate-500 font-mono-code">
                Administradores y Colaboradores RBAC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6 sm:p-7">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && !errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          {step === 1 ? (
            /* PASO 1: Ingreso de Correo y Contraseña */
            <form onSubmit={handleCredentialsSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    autoComplete="off"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/15 outline-none font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/15 outline-none font-medium transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#0A6CFF] hover:bg-[#0058D6] shadow-md shadow-blue-500/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {isPrimaryEmail(email)
                          ? 'Verificar y Enviar Token al Correo'
                          : 'Iniciar Sesión con mis Permisos'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* PASO 2: Verificación OTP con Temporizador de 5 minutos */
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-sm text-slate-900">
                  Código de Seguridad de 6 Dígitos
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Se ha enviado un token transaccional directo a tu bandeja de correo.
                </p>

                {/* Temporizador de Expiración */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-slate-100 text-slate-700 text-xs font-mono-code font-bold border border-slate-200">
                  <Clock className={`w-3.5 h-3.5 ${remainingSeconds < 60 ? 'text-rose-500 animate-pulse' : 'text-[#0A6CFF]'}`} />
                  <span>Expira en: {formatTime(remainingSeconds)}</span>
                </div>
              </div>

              {/* Casillas de 6 Dígitos */}
              <div className="flex justify-center gap-2">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={remainingSeconds <= 0}
                    className="w-10 sm:w-11 h-12 text-center text-lg font-bold font-mono-code bg-slate-50 border border-slate-300 rounded-xl focus:border-[#0A6CFF] focus:bg-white focus:ring-2 focus:ring-[#0A6CFF]/20 outline-none transition-all text-slate-900 disabled:opacity-40"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 underline"
                >
                  Volver al Login
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-[#0A6CFF] font-semibold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Reenviar token</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleValidateOtp(otpCode.join(''))}
                disabled={isLoading || otpCode.join('').length < 6 || remainingSeconds <= 0}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-40"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Autorizar Sesión de Administrador</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Pie de seguridad */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-mono-code">
            🔒 Autenticación en dos pasos (2FA) con pasarela transaccional de 256 bits.
          </p>
        </div>
      </div>
    </div>
  );
};
