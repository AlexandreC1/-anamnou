import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useResource } from './class-api';
import { LoadState } from './ClassCommon';
import { GovernanceAction, type Grant } from './GovernanceSettings';
import type { Locale } from './identity-copy';

const labels = {
  en: {
    title: 'Participation review',
    intro:
      'Review the institution’s applicable rules and protected records before deciding. This form does not verify age, guardian authority or legal compliance for you.',
    school: 'School ID',
    open: 'Open school',
    policy: 'Propose a policy version',
    jurisdiction: 'Jurisdiction and scope',
    notice: 'Participation notice',
    reference: 'Protected review record reference',
    expires: 'Expires at',
    propose: 'Propose policy',
    policies: 'Policy versions',
    approve: 'Approve independently',
    reason: 'Decision reason (do not include sensitive evidence)',
    queue: 'Participation requests',
    authority: 'Verified authorization basis',
    self: 'Adult or otherwise authorized self-participation',
    guardian: 'Guardian authorization',
    institution: 'Institutional authorization',
    combined: 'Combined authorizations',
    decision: 'Decision',
    allow: 'Approve participation',
    deny: 'Decline participation',
    save: 'Record decision',
    empty: 'No records.',
    security: 'Security settings',
    back: 'My participation',
    next: 'Next page',
    previous: 'Previous page',
    refresh: 'Refresh',
    version: 'Version',
  },
  fr: {
    title: 'Examen de participation',
    intro:
      'Examinez les règles applicables et les documents protégés avant de décider. Ce formulaire ne vérifie pas l’âge, l’autorité du responsable légal ou la conformité juridique à votre place.',
    school: 'Identifiant de l’établissement',
    open: 'Ouvrir l’établissement',
    policy: 'Proposer une version de politique',
    jurisdiction: 'Juridiction et portée',
    notice: 'Notice de participation',
    reference: 'Référence du dossier protégé',
    expires: 'Expiration',
    propose: 'Proposer la politique',
    policies: 'Versions de politique',
    approve: 'Approuver indépendamment',
    reason: 'Motif de décision (sans preuve sensible)',
    queue: 'Demandes de participation',
    authority: 'Fondement d’autorisation vérifié',
    self: 'Participation personnelle autorisée',
    guardian: 'Autorisation du responsable légal',
    institution: 'Autorisation institutionnelle',
    combined: 'Autorisations combinées',
    decision: 'Décision',
    allow: 'Approuver la participation',
    deny: 'Refuser la participation',
    save: 'Enregistrer la décision',
    empty: 'Aucun dossier.',
    security: 'Paramètres de sécurité',
    back: 'Ma participation',
    next: 'Page suivante',
    previous: 'Page précédente',
    refresh: 'Actualiser',
    version: 'Version',
  },
  ht: {
    title: 'Revizyon patisipasyon',
    intro:
      'Revize règ enstitisyon an ak dosye pwoteje yo anvan ou deside. Fòm sa a pa verifye laj, otorite gadyen oswa konfòmite legal pou ou.',
    school: 'ID lekòl la',
    open: 'Louvri lekòl la',
    policy: 'Pwopoze yon vèsyon politik',
    jurisdiction: 'Jiridiksyon ak sijè',
    notice: 'Avi patisipasyon',
    reference: 'Referans dosye revizyon pwoteje',
    expires: 'Ekspirasyon',
    propose: 'Pwopoze politik la',
    policies: 'Vèsyon politik yo',
    approve: 'Apwouve endepandamman',
    reason: 'Rezon desizyon an (pa mete prèv sansib)',
    queue: 'Demann patisipasyon',
    authority: 'Baz otorizasyon ki verifye',
    self: 'Patisipasyon pèsonèl otorize',
    guardian: 'Otorizasyon gadyen',
    institution: 'Otorizasyon enstitisyon',
    combined: 'Otorizasyon konbine',
    decision: 'Desizyon',
    allow: 'Apwouve patisipasyon',
    deny: 'Refize patisipasyon',
    save: 'Anrejistre desizyon',
    empty: 'Pa gen dosye.',
    security: 'Paramèt sekirite',
    back: 'Patisipasyon mwen',
    next: 'Paj apre',
    previous: 'Paj anvan',
    refresh: 'Rafrechi',
    version: 'Vèsyon',
  },
  es: {
    title: 'Revisión de participación',
    intro:
      'Revisa las normas aplicables y los registros protegidos antes de decidir. Este formulario no verifica por ti la edad, la autoridad del tutor ni el cumplimiento legal.',
    school: 'ID de la institución',
    open: 'Abrir institución',
    policy: 'Proponer versión de política',
    jurisdiction: 'Jurisdicción y alcance',
    notice: 'Aviso de participación',
    reference: 'Referencia del registro protegido',
    expires: 'Vencimiento',
    propose: 'Proponer política',
    policies: 'Versiones de política',
    approve: 'Aprobar independientemente',
    reason: 'Motivo de la decisión (sin pruebas sensibles)',
    queue: 'Solicitudes de participación',
    authority: 'Base de autorización verificada',
    self: 'Participación personal autorizada',
    guardian: 'Autorización del tutor',
    institution: 'Autorización institucional',
    combined: 'Autorizaciones combinadas',
    decision: 'Decisión',
    allow: 'Aprobar participación',
    deny: 'Rechazar participación',
    save: 'Registrar decisión',
    empty: 'Sin registros.',
    security: 'Configuración de seguridad',
    back: 'Mi participación',
    next: 'Página siguiente',
    previous: 'Página anterior',
    refresh: 'Actualizar',
    version: 'Versión',
  },
};
type Policy = {
  id: string;
  version: number;
  notice: string;
  jurisdiction: string;
  approvedAt: string | null;
  expiresAt: string;
  createdById: string;
};
type Case = {
  id: string;
  membershipId: string;
  policyId: string;
  status: string;
  version: number;
  membership: {
    userId: string;
    classId: string;
    user: { displayName: string };
  };
  policy: Policy;
};
type Page<T> = { items: T[]; nextCursor: string | null };
function Field({
  label,
  name,
  children,
}: {
  label: string;
  name: string;
  children?: ReactNode;
}) {
  return (
    <label>
      {label}
      {children ?? <input name={name} required maxLength={120} />}
    </label>
  );
}
function Reason({ locale }: { locale: Locale }) {
  return (
    <Field label={labels[locale].reason} name="reason">
      <textarea name="reason" minLength={20} maxLength={500} required />
    </Field>
  );
}
function Expiry({ locale }: { locale: Locale }) {
  return (
    <Field label={labels[locale].expires} name="expiresAt">
      <input type="datetime-local" name="expiresAt" required />
    </Field>
  );
}
const iso = (data: FormData) =>
  new Date(String(data.get('expiresAt'))).toISOString();
function useReviewClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function ParticipationReview({ locale }: { locale: Locale }) {
  const now = useReviewClock();
  const t = labels[locale],
    account = useResource<{ id: string; role: string }>('/me'),
    grants = useResource<Grant[]>('/me/governance/grants');
  const [school, setSchool] = useState('');
  return (
    <section className="appearance-settings">
      <p className="eyebrow">Anamnou</p>
      <h1>{t.title}</h1>
      <p className="intro">{t.intro}</p>
      <Link to="/settings/participation">{t.back}</Link>
      {' · '}
      <Link to="/settings/security">{t.security}</Link>
      {!account.data || !grants.data ? (
        <LoadState
          locale={locale}
          error={account.error ?? grants.error}
          retry={() => {
            account.reload();
            grants.reload();
          }}
        />
      ) : (
        <>
          <form
            className="account-form theme-panel"
            onSubmit={(e) => {
              e.preventDefault();
              setSchool(String(new FormData(e.currentTarget).get('schoolId')));
            }}
          >
            <Field name="schoolId" label={t.school}>
              <input name="schoolId" required pattern="[0-9a-fA-F-]{36}" />
            </Field>
            <button>{t.open}</button>
          </form>
          {school && (
            <ReviewSchool
              key={school}
              schoolId={school}
              locale={locale}
              actor={account.data}
              reviewer={grants.data.some(
                (g) =>
                  g.schoolId === school &&
                  g.role === 'CONSENT_REVIEWER' &&
                  g.status === 'ACTIVE' &&
                  Date.parse(g.expiresAt) > now,
              )}
            />
          )}
        </>
      )}
    </section>
  );
}
function ReviewSchool({
  schoolId,
  locale,
  actor,
  reviewer,
}: {
  schoolId: string;
  locale: Locale;
  actor: { id: string; role: string };
  reviewer: boolean;
}) {
  const now = useReviewClock();
  const t = labels[locale];
  const [cursors, setCursors] = useState<string[]>([]);
  const [policyCursors, setPolicyCursors] = useState<string[]>([]);
  const policies = useResource<Page<Policy>>(
    '/governance/participation/policies?schoolId=' +
      schoolId +
      (policyCursors.length ? '&cursor=' + policyCursors.at(-1) : ''),
  );
  return (
    <>
      {actor.role === 'PLATFORM_ADMIN' && (
        <section className="theme-panel">
          <h2>{t.policy}</h2>
          <GovernanceAction
            locale={locale}
            path="/governance/participation/policies"
            label={t.propose}
            done={policies.reload}
            body={(d) => ({
              schoolId,
              jurisdiction: d.get('jurisdiction'),
              notice: d.get('notice'),
              reviewReference: d.get('reviewReference'),
              expiresAt: iso(d),
            })}
          >
            <Field label={t.jurisdiction} name="jurisdiction" />
            <Field label={t.notice} name="notice">
              <textarea
                name="notice"
                required
                minLength={100}
                maxLength={6000}
              />
            </Field>
            <Field label={t.reference} name="reviewReference" />
            <Expiry locale={locale} />
          </GovernanceAction>
        </section>
      )}
      <section className="theme-panel">
        <h2>{t.policies}</h2>
        <button type="button" onClick={policies.reload}>
          {t.refresh}
        </button>
        {!policies.data ? (
          <LoadState
            locale={locale}
            error={policies.error}
            retry={policies.reload}
          />
        ) : (
          <>
            {policies.data.items.length === 0 && <p>{t.empty}</p>}
            {policies.data.items.map((p) => (
              <article key={p.id}>
                <h3>
                  {p.jurisdiction} · {t.version} {p.version}
                </h3>
                <p>
                  <code>{p.id}</code>
                </p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{p.notice}</p>
                <p>
                  {t.expires}: {new Date(p.expiresAt).toLocaleString(locale)}
                </p>
                {actor.role === 'PLATFORM_ADMIN' &&
                  actor.id !== p.createdById &&
                  !p.approvedAt &&
                  Date.parse(p.expiresAt) > now && (
                    <GovernanceAction
                      locale={locale}
                      path={
                        '/governance/participation/policies/' +
                        p.id +
                        '/approve'
                      }
                      label={t.approve}
                      done={policies.reload}
                      body={(d) => ({ reason: d.get('reason') })}
                    >
                      <Reason locale={locale} />
                    </GovernanceAction>
                  )}
              </article>
            ))}
            <button
              disabled={!policyCursors.length}
              onClick={() => setPolicyCursors((c) => c.slice(0, -1))}
            >
              {t.previous}
            </button>
            <button
              disabled={!policies.data.nextCursor}
              onClick={() =>
                setPolicyCursors((c) => [...c, policies.data!.nextCursor!])
              }
            >
              {t.next}
            </button>
          </>
        )}
      </section>
      {reviewer && (
        <ReviewCases
          schoolId={schoolId}
          locale={locale}
          actorId={actor.id}
          cursor={cursors.at(-1)}
          previous={() => setCursors((c) => c.slice(0, -1))}
          canPrevious={!!cursors.length}
          next={(cursor) => setCursors((c) => [...c, cursor])}
        />
      )}
    </>
  );
}
function ReviewCases({
  schoolId,
  locale,
  actorId,
  cursor,
  previous,
  canPrevious,
  next,
}: {
  schoolId: string;
  locale: Locale;
  actorId: string;
  cursor?: string;
  previous: () => void;
  canPrevious: boolean;
  next: (cursor: string) => void;
}) {
  const t = labels[locale];
  const cases = useResource<Page<Case>>(
    '/governance/participation?schoolId=' +
      schoolId +
      (cursor ? '&cursor=' + cursor : ''),
  );
  return (
    <section className="theme-panel">
      <h2>{t.queue}</h2>
      <button type="button" onClick={cases.reload}>
        {t.refresh}
      </button>
      {!cases.data ? (
        <LoadState locale={locale} error={cases.error} retry={cases.reload} />
      ) : (
        <>
          {cases.data.items.length === 0 && <p>{t.empty}</p>}
          {cases.data.items.map((item) => (
            <article key={item.id + ':' + item.version}>
              <h3>{item.membership.user.displayName}</h3>
              <p>
                {item.status} · {t.version} {item.version}
              </p>
              <p>{item.policy.jurisdiction}</p>
              <details>
                <summary>{t.notice}</summary>
                <p style={{ whiteSpace: 'pre-wrap' }}>{item.policy.notice}</p>
              </details>
              {item.status === 'PENDING' &&
                item.membership.userId !== actorId && (
                  <GovernanceAction
                    locale={locale}
                    path={
                      '/governance/participation/' +
                      item.membershipId +
                      '/decision'
                    }
                    label={t.save}
                    done={cases.reload}
                    body={(d) => ({
                      version: item.version,
                      approve: d.get('approve') === 'true',
                      authority: d.get('authority'),
                      reviewReference: d.get('reviewReference'),
                      reason: d.get('reason'),
                      expiresAt: iso(d),
                    })}
                  >
                    <Field label={t.decision} name="approve">
                      <select name="approve" required>
                        <option value="">{t.decision}</option>
                        <option value="false">{t.deny}</option>
                        <option value="true">{t.allow}</option>
                      </select>
                    </Field>
                    <Field label={t.authority} name="authority">
                      <select name="authority" required>
                        <option value="">{t.authority}</option>
                        {(
                          [
                            'SELF',
                            'GUARDIAN',
                            'INSTITUTION',
                            'COMBINED',
                          ] as const
                        ).map((value, i) => (
                          <option key={value} value={value}>
                            {[t.self, t.guardian, t.institution, t.combined][i]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t.reference} name="reviewReference" />
                    <Reason locale={locale} />
                    <Expiry locale={locale} />
                  </GovernanceAction>
                )}
            </article>
          ))}
          <button disabled={!canPrevious} onClick={previous}>
            {t.previous}
          </button>
          <button
            disabled={!cases.data.nextCursor}
            onClick={() => next(cases.data!.nextCursor!)}
          >
            {t.next}
          </button>
        </>
      )}
    </section>
  );
}
