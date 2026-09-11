import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { classCopy } from './class-copy';
import {
  useResource,
  type ClassDetail,
  type Invitation,
  type InvitationSecret,
  type Member,
  type Page,
} from './class-api';
import {
  LoadState,
  Pagination,
  ResourceForm,
  RoleOptions,
  roleLabel,
} from './ClassCommon';
import { ClassFields, classFieldsBody } from './Classes';
import type { Locale } from './identity-copy';

export function MemberDirectory({ locale }: { locale: Locale }) {
  const { id = '' } = useParams();
  const t = classCopy[locale];
  const [page, setPage] = useState(1);
  const klass = useResource<ClassDetail>('/classes/' + id);
  const result = useResource<Page<Member>>(
    '/classes/' + id + '/members?page=' + page,
  );
  return (
    <section className="class-page">
      <h1>{t.members}</h1>
      {!result.data ? (
        <LoadState error={result.error} retry={result.reload} locale={locale} />
      ) : (
        <>
          <ul className="member-list">
            {result.data.items.map((member) => (
              <li key={member.id}>
                <h2>{member.displayName}</h2>
                <p>
                  {roleLabel(member.role, locale)} ·{' '}
                  {member.status === 'ACTIVE' ? t.active : t.removed}
                </p>
                {klass.data?.permissions.manage && (
                  <ResourceForm
                    path={'/classes/' + id + '/members/' + member.id}
                    method="PATCH"
                    locale={locale}
                    label={t.save}
                    body={(data) => ({
                      role: data.get('role'),
                      status: data.get('status'),
                    })}
                    done={() => {
                      result.reload();
                      klass.reload();
                    }}
                  >
                    <label>
                      {t.role}
                      <select name="role" defaultValue={member.role}>
                        <RoleOptions locale={locale} />
                      </select>
                    </label>
                    <label>
                      {t.status}
                      <select name="status" defaultValue={member.status}>
                        <option value="ACTIVE">{t.active}</option>
                        <option value="REMOVED">{t.removed}</option>
                      </select>
                    </label>
                  </ResourceForm>
                )}
              </li>
            ))}
          </ul>
          <Pagination value={result.data} change={setPage} locale={locale} />
        </>
      )}
      <p>
        <Link to={'/classes/' + id}>{t.myClasses}</Link>
      </p>
    </section>
  );
}
function InvitationShare({
  value,
  locale,
}: {
  value: InvitationSecret;
  locale: Locale;
}) {
  const t = classCopy[locale];
  const [qr, setQr] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void import('qrcode')
      .then((module) =>
        module.toDataURL(value.url, {
          width: 256,
          margin: 4,
          errorCorrectionLevel: 'M',
        }),
      )
      .then(
        (url) => {
          if (active) setQr(url);
        },
        () => {
          if (active) setFailed(true);
        },
      );
    return () => {
      active = false;
    };
  }, [value.url]);
  return (
    <section className="invitation-share" aria-label={t.share}>
      <h2>{t.share}</h2>
      <p>{t.once}</p>
      <label>
        {t.code}
        <input
          readOnly
          value={value.code}
          onFocus={(event) => event.target.select()}
        />
      </label>
      <label>
        {t.link}
        <input
          readOnly
          value={value.url}
          onFocus={(event) => event.target.select()}
        />
      </label>
      {qr ? (
        <img width={256} height={256} src={qr} alt={t.qr} />
      ) : failed ? (
        <p role="alert">{t.qrError}</p>
      ) : (
        <p role="status">{t.loading}</p>
      )}
    </section>
  );
}
function InvitationManager({ id, locale }: { id: string; locale: Locale }) {
  const t = classCopy[locale];
  const [secret, setSecret] = useState<InvitationSecret>();
  const [page, setPage] = useState(1);
  const result = useResource<Page<Invitation>>(
    '/classes/' + id + '/invitations?page=' + page,
  );
  return (
    <section>
      <h2>{t.invite}</h2>
      <ResourceForm
        path={'/classes/' + id + '/invitations'}
        label={t.invite}
        locale={locale}
        body={(data) => ({
          role: data.get('role'),
          expiresInDays: Number(data.get('days')),
          maxUses: Number(data.get('maxUses')),
        })}
        done={(value) => {
          setSecret(value as InvitationSecret);
          result.reload();
        }}
      >
        <label>
          {t.role}
          <select name="role">
            <RoleOptions invite locale={locale} />
          </select>
        </label>
        <label>
          {t.days}
          <input
            name="days"
            type="number"
            min={1}
            max={30}
            defaultValue={7}
            required
          />
        </label>
        <label>
          {t.maxUses}
          <input
            name="maxUses"
            type="number"
            min={1}
            max={500}
            defaultValue={30}
            required
          />
        </label>
      </ResourceForm>
      {secret && (
        <InvitationShare key={secret.code} value={secret} locale={locale} />
      )}
      <h2>{t.inviteList}</h2>
      {!result.data ? (
        <LoadState error={result.error} retry={result.reload} locale={locale} />
      ) : (
        <>
          {result.data.items.length === 0 && <p>{t.inviteEmpty}</p>}
          <ul className="invitation-list">
            {result.data.items.map((invite) => (
              <li key={invite.id}>
                <p>
                  {roleLabel(invite.role, locale)} · {t.used}:{' '}
                  {invite.usedCount}/{invite.maxUses}
                </p>
                <p>
                  {t.expires}:{' '}
                  {new Date(invite.expiresAt).toLocaleDateString(locale)}
                </p>
                {invite.status === 'REVOKED' ? (
                  <p>{t.revoked}</p>
                ) : (
                  <ResourceForm
                    path={
                      '/classes/' + id + '/invitations/' + invite.id + '/revoke'
                    }
                    locale={locale}
                    label={t.revoke}
                    body={() => ({})}
                    done={() => {
                      if (secret?.id === invite.id) setSecret(undefined);
                      result.reload();
                    }}
                  >
                    {null}
                  </ResourceForm>
                )}
              </li>
            ))}
          </ul>
          <Pagination value={result.data} change={setPage} locale={locale} />
        </>
      )}
    </section>
  );
}
export function ClassManage({ locale }: { locale: Locale }) {
  const { id = '' } = useParams();
  const t = classCopy[locale];
  const result = useResource<ClassDetail>('/classes/' + id);
  return (
    <section className="class-page">
      <h1>{t.manage}</h1>
      {!result.data ? (
        <LoadState error={result.error} retry={result.reload} locale={locale} />
      ) : !result.data.permissions.manage ? (
        <p role="alert">{t.denied}</p>
      ) : (
        <div className="class-columns">
          <section>
            <h2>{result.data.name}</h2>
            <ResourceForm
              key={id}
              path={'/classes/' + id}
              method="PATCH"
              locale={locale}
              label={t.save}
              body={classFieldsBody}
            >
              <ClassFields locale={locale} klass={result.data} />
            </ResourceForm>
            <p>
              <Link to={'/classes/' + id + '/members'}>{t.members}</Link>
            </p>
          </section>
          <InvitationManager key={id} id={id} locale={locale} />
        </div>
      )}
      <p>
        <Link to={'/classes/' + id}>{t.myClasses}</Link>
      </p>
    </section>
  );
}
