export type Locale = 'ht' | 'fr' | 'en' | 'es';
const en = {
  account: 'My account',
  register: 'Create your account',
  login: 'Sign in',
  logout: 'Sign out',
  email: 'Email address',
  password: 'Password',
  name: 'Display name',
  save: 'Save changes',
  forgot: 'Forgot your password?',
  recover: 'Recover your account',
  reset: 'Choose a new password',
  verify: 'Verify your email',
  resend: 'Send a verification link',
  send: 'Send recovery link',
  passwordHint: 'Use 15–128 characters. A few memorable words work well.',
  introduction: 'Your next chapter starts with you.',
  privacy:
    'Your email stays private. Choose a name your classmates will recognize.',
  verified: 'Your email is verified. You can now sign in.',
  resetDone: 'Password updated. Sign in with your new password.',
  saved: 'Your changes are saved.',
  busy: 'Please wait…',
  loading: 'Loading your account…',
  error: 'We could not complete this request. Please try again.',
  invalid:
    'Check your details. Links may have expired or already been used. Request a new link below.',
  denied:
    'Unable to sign in. Check your email and password, and verify your email first.',
  limited: 'Too many attempts. Wait 15 minutes before trying again.',
  expired: 'Your session has ended. Sign in again.',
  missing: 'Open the link from your email, or request a fresh link below.',
  profileIntro:
    'This is your personal account. Your classes are ready when you are.',
  retry: 'Try again',
  mfaTitle: 'Enter your verification code',
  mfaIntro:
    'Open your authenticator app and enter the six-digit code, or use one of your recovery codes.',
  mfaCode: 'Verification code',
  mfaVerify: 'Verify and sign in',
  mfaDenied:
    'That code did not work. Check the code, or sign in again if this step has expired.',
  language: 'Preferred email language',
};
type IdentityCopy = typeof en;
export const identityCopy: Record<Locale, IdentityCopy> = {
  en,
  ht: {
    account: 'Kont mwen',
    register: 'Kreye kont ou',
    login: 'Konekte',
    logout: 'Dekonekte',
    email: 'Adrès imèl',
    password: 'Modpas',
    name: 'Non pou afiche',
    save: 'Anrejistre chanjman yo',
    forgot: 'Ou bliye modpas ou?',
    recover: 'Rekipere kont ou',
    reset: 'Chwazi yon nouvo modpas',
    verify: 'Verifye imèl ou',
    resend: 'Voye yon lyen verifikasyon',
    send: 'Voye lyen rekiperasyon an',
    passwordHint:
      'Itilize 15–128 karaktè. Kèk mo ou sonje fasil ka mache byen.',
    introduction: 'Pwochen chapit ou a kòmanse avèk ou.',
    privacy:
      'Imèl ou rete prive. Chwazi yon non kamarad klas ou yo ap rekonèt.',
    verified: 'Imèl ou verifye. Ou ka konekte kounye a.',
    resetDone: 'Modpas ou chanje. Konekte avèk nouvo modpas ou a.',
    saved: 'Chanjman ou yo anrejistre.',
    busy: 'Tanpri tann…',
    loading: 'N ap chaje kont ou…',
    error: 'Nou pa t kapab fini demann sa a. Tanpri eseye ankò.',
    invalid:
      'Tcheke enfòmasyon ou yo. Lyen an ka ekspire oswa deja itilize. Mande yon nouvo lyen anba a.',
    denied:
      'Nou pa ka konekte ou. Tcheke imèl ak modpas ou, epi verifye imèl ou anvan.',
    limited: 'Twòp tantativ. Tann 15 minit anvan ou eseye ankò.',
    expired: 'Sesyon ou fini. Konekte ankò.',
    missing: 'Louvri lyen ki nan imèl ou a, oswa mande yon nouvo lyen anba a.',
    profileIntro: 'Sa a se kont pèsonèl ou. Klas ou yo pare lè ou pare.',
    retry: 'Eseye ankò',
    mfaTitle: 'Antre kòd verifikasyon ou',
    mfaIntro:
      'Louvri aplikasyon otantifikasyon ou epi antre kòd sis chif la, oswa sèvi ak youn nan kòd rekiperasyon ou yo.',
    mfaCode: 'Kòd verifikasyon',
    mfaVerify: 'Verifye epi konekte',
    mfaDenied:
      'Kòd sa a pa mache. Verifye kòd la, oswa konekte ankò si etap sa a ekspire.',
    language: 'Lang ou prefere pou imèl',
  },
  fr: {
    account: 'Mon compte',
    register: 'Créez votre compte',
    login: 'Se connecter',
    logout: 'Se déconnecter',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    name: 'Nom affiché',
    save: 'Enregistrer les modifications',
    forgot: 'Mot de passe oublié ?',
    recover: 'Récupérez votre compte',
    reset: 'Choisissez un nouveau mot de passe',
    verify: 'Vérifiez votre e-mail',
    resend: 'Envoyer un lien de vérification',
    send: 'Envoyer le lien de récupération',
    passwordHint:
      'Utilisez 15 à 128 caractères. Quelques mots faciles à retenir conviennent bien.',
    introduction: 'Votre prochain chapitre commence avec vous.',
    privacy:
      'Votre e-mail reste privé. Choisissez un nom que vos camarades reconnaîtront.',
    verified: 'Votre e-mail est vérifié. Vous pouvez vous connecter.',
    resetDone:
      'Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.',
    saved: 'Vos modifications sont enregistrées.',
    busy: 'Veuillez patienter…',
    loading: 'Chargement de votre compte…',
    error: 'La demande n’a pas pu aboutir. Veuillez réessayer.',
    invalid:
      'Vérifiez vos informations. Le lien peut avoir expiré ou avoir déjà été utilisé. Demandez un nouveau lien ci-dessous.',
    denied:
      'Connexion impossible. Vérifiez votre e-mail et votre mot de passe, et confirmez d’abord votre adresse.',
    limited: 'Trop de tentatives. Patientez 15 minutes avant de réessayer.',
    expired: 'Votre session est terminée. Reconnectez-vous.',
    missing:
      'Ouvrez le lien reçu par e-mail ou demandez un nouveau lien ci-dessous.',
    profileIntro: 'Voici votre compte personnel. Vos classes vous attendent.',
    retry: 'Réessayer',
    mfaTitle: 'Saisissez votre code de vérification',
    mfaIntro:
      'Ouvrez votre application d’authentification et saisissez le code à six chiffres, ou utilisez un code de récupération.',
    mfaCode: 'Code de vérification',
    mfaVerify: 'Vérifier et se connecter',
    mfaDenied:
      'Ce code n’a pas fonctionné. Vérifiez-le, ou reconnectez-vous si cette étape a expiré.',
    language: 'Langue préférée pour les e-mails',
  },
  es: {
    account: 'Mi cuenta',
    register: 'Crea tu cuenta',
    login: 'Iniciar sesión',
    logout: 'Cerrar sesión',
    email: 'Correo electrónico',
    password: 'Contraseña',
    name: 'Nombre visible',
    save: 'Guardar cambios',
    forgot: '¿Olvidaste tu contraseña?',
    recover: 'Recupera tu cuenta',
    reset: 'Elige una nueva contraseña',
    verify: 'Verifica tu correo',
    resend: 'Enviar un enlace de verificación',
    send: 'Enviar enlace de recuperación',
    passwordHint:
      'Usa entre 15 y 128 caracteres. Unas palabras fáciles de recordar funcionan bien.',
    introduction: 'Tu próximo capítulo empieza contigo.',
    privacy:
      'Tu correo se mantiene privado. Elige un nombre que tus compañeros reconozcan.',
    verified: 'Tu correo está verificado. Ya puedes iniciar sesión.',
    resetDone: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.',
    saved: 'Tus cambios están guardados.',
    busy: 'Espera un momento…',
    loading: 'Cargando tu cuenta…',
    error: 'No pudimos completar la solicitud. Inténtalo de nuevo.',
    invalid:
      'Revisa tus datos. El enlace puede haber caducado o haberse utilizado. Solicita uno nuevo abajo.',
    denied:
      'No se pudo iniciar sesión. Revisa tu correo y contraseña, y verifica primero tu correo.',
    limited:
      'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.',
    expired: 'Tu sesión ha terminado. Inicia sesión de nuevo.',
    missing: 'Abre el enlace de tu correo o solicita uno nuevo abajo.',
    profileIntro: 'Esta es tu cuenta personal. Tus clases te esperan.',
    retry: 'Intentar de nuevo',
    mfaTitle: 'Introduce tu código de verificación',
    mfaIntro:
      'Abre tu aplicación de autenticación e introduce el código de seis dígitos, o usa uno de tus códigos de recuperación.',
    mfaCode: 'Código de verificación',
    mfaVerify: 'Verificar e iniciar sesión',
    mfaDenied:
      'Ese código no funcionó. Revísalo o vuelve a iniciar sesión si este paso caducó.',
    language: 'Idioma preferido para los correos',
  },
};
