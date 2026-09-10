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
  sent: 'If this address is eligible, an email will arrive with your next step. Check your inbox and spam folder.',
  registered:
    'Check your inbox to verify your email before signing in. Already registered? Sign in or request a fresh verification link.',
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
    'This is your personal account. Class spaces will arrive in the next release.',
  retry: 'Try again',
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
    sent: 'Si adrès sa a kalifye, w ap resevwa yon imèl ak pwochen etap la. Tcheke bwat resepsyon ak spam ou.',
    registered:
      'Tcheke imèl ou pou verifye adrès ou anvan ou konekte. Ou deja enskri? Konekte oswa mande yon nouvo lyen verifikasyon.',
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
    profileIntro:
      'Sa a se kont pèsonèl ou. Espas klas yo ap vini nan pwochen vèsyon an.',
    retry: 'Eseye ankò',
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
    sent: 'Si cette adresse est éligible, un e-mail vous indiquera la prochaine étape. Vérifiez votre boîte de réception et vos indésirables.',
    registered:
      'Vérifiez votre adresse via l’e-mail reçu avant de vous connecter. Déjà inscrit ? Connectez-vous ou demandez un nouveau lien de vérification.',
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
    profileIntro:
      'Voici votre compte personnel. Les espaces de classe arriveront dans la prochaine version.',
    retry: 'Réessayer',
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
    sent: 'Si esta dirección cumple los requisitos, recibirás un correo con el siguiente paso. Revisa tu bandeja de entrada y el correo no deseado.',
    registered:
      'Revisa tu correo para verificar tu dirección antes de iniciar sesión. ¿Ya tienes cuenta? Inicia sesión o solicita un nuevo enlace de verificación.',
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
    profileIntro:
      'Esta es tu cuenta personal. Los espacios de clase llegarán en la próxima versión.',
    retry: 'Intentar de nuevo',
    language: 'Idioma preferido para los correos',
  },
};
