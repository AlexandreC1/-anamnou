import type { Locale } from './identity-copy';
const en = {
  title: 'Check your email',
  received: 'Request received.',
  verify:
    'Open the latest verification email and follow its link to confirm your address. Then sign in.',
  recovery:
    'Open the latest password-reset email and follow its link to choose a new password.',
  local:
    'For this local preview, emails appear in the test inbox below. Nothing is sent to your personal mailbox.',
  inbox: 'Open test inbox',
  change: 'Use a different email address',
  missing:
    'No email? Check the address, look in spam, or request another link.',
};
export const deliveryCopy: Record<Locale, typeof en> = {
  en,
  fr: {
    title: 'Consultez votre e-mail',
    received: 'Demande reçue.',
    verify:
      'Ouvrez le dernier e-mail de vérification et suivez le lien pour confirmer votre adresse. Vous pourrez ensuite vous connecter.',
    recovery:
      'Ouvrez le dernier e-mail de réinitialisation et suivez le lien pour choisir un nouveau mot de passe.',
    local:
      'Dans cette version locale, les e-mails arrivent dans la boîte de test ci-dessous. Aucun e-mail n’est envoyé à votre messagerie personnelle.',
    inbox: 'Ouvrir la boîte de test',
    change: 'Utiliser une autre adresse e-mail',
    missing:
      'Aucun e-mail ? Vérifiez l’adresse et les indésirables, ou demandez un nouveau lien.',
  },
  ht: {
    title: 'Tcheke imèl ou',
    received: 'Nou resevwa demann ou an.',
    verify:
      'Louvri dènye imèl verifikasyon an epi swiv lyen an pou konfime adrès ou. Apre sa, konekte.',
    recovery:
      'Louvri dènye imèl rekiperasyon an epi swiv lyen an pou chwazi yon nouvo modpas.',
    local:
      'Nan vèsyon lokal sa a, imèl yo rive nan bwat tès ki anba a. Nou pa voye imèl nan bwat pèsonèl ou.',
    inbox: 'Louvri bwat tès la',
    change: 'Itilize yon lòt adrès imèl',
    missing:
      'Pa gen imèl? Tcheke adrès la ak spam ou, oswa mande yon nouvo lyen.',
  },
  es: {
    title: 'Revisa tu correo',
    received: 'Solicitud recibida.',
    verify:
      'Abre el último correo de verificación y sigue el enlace para confirmar tu dirección. Después podrás iniciar sesión.',
    recovery:
      'Abre el último correo de recuperación y sigue el enlace para elegir una nueva contraseña.',
    local:
      'En esta versión local, los correos llegan al buzón de prueba de abajo. No se envían a tu correo personal.',
    inbox: 'Abrir el buzón de prueba',
    change: 'Usar otra dirección de correo',
    missing:
      '¿No hay correo? Revisa la dirección y el correo no deseado, o solicita otro enlace.',
  },
};
