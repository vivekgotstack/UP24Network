'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AdminWorkspace } from '@/components/newsroom/admin-workspace';
import { useSession,useNewsroomResource } from '@/lib/session';
import { cms,type Account } from '@/lib/cms';
import { defaultWorkflow,type WorkflowPolicy } from '@/lib/newsroom/workflows';
import { sections } from '@/lib/sections';
import { Button } from '@/components/ui/button';

function EmployeeWorkflow({account}: {account:Account}) {
  const session=useSession();
  const resource=useNewsroomResource<WorkflowPolicy>(session.data,`admin/accounts/${account.id}/workflow`);
  const [draft,setDraft]=useState<WorkflowPolicy|null>(null),[notice,setNotice]=useState('');
  const policy=draft ?? resource.data ?? {...defaultWorkflow,accountId:account.id};
  const saving=useMutation({ mutationFn:()=>cms<WorkflowPolicy>(`admin/accounts/${account.id}/workflow`,'PUT',policy),
    onSuccess:saved=>{resource.setData(saved);setDraft(null);setNotice('Workflow saved. These requirements apply to this employee’s next edit.');} });
  return <section className="admin-card"><h2>{account.displayName}</h2><p>{account.role.toLowerCase()} · {account.email}</p>
    <p>Keep the full reporting checklist or simplify it for this employee. Reporter publication still requires an editor or administrator.</p>
    {resource.error && <p role="alert" className="inline-error">{resource.error.message}</p>}
    <form className="cms-form" onSubmit={event=>{event.preventDefault();saving.mutate();}}>
      <fieldset disabled={resource.isLoading || saving.isPending} className="workflow-flags">
        {([
          ['requireDateline','Require a location or dateline'],['requireSources','Require private reporting sources'],
          ['requireMedia','Require a photograph or video'],['autofill','Allow metadata fetching and draft helpers'],
        ] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={policy[key]}
          onChange={event=>{setDraft({...policy,[key]:event.target.checked});setNotice('');}} />{label}</label>)}
      </fieldset>
      <label>Default news section<select value={policy.defaultCategory} disabled={saving.isPending} onChange={event=>setDraft({...policy,defaultCategory:event.target.value})}>
        {sections.map(section=><option key={section}>{section}</option>)}
      </select></label>
      <label>Default city or dateline<input value={policy.defaultCity} maxLength={100} disabled={saving.isPending}
        onChange={event=>setDraft({...policy,defaultCity:event.target.value})} /></label>
      <div className="cms-row-actions"><Button disabled={resource.isLoading || saving.isPending}>{saving.isPending?'Saving…':'Save workflow'}</Button>
        {draft && <Button type="button" variant="outline" onClick={()=>setDraft(null)}>Discard changes</Button>}</div>
      {saving.error && <p role="alert" className="inline-error">{saving.error.message}</p>}
      {notice && <p role="status">{notice}</p>}
    </form>
  </section>;
}

export function WorkflowPanel() {
  const session=useSession();
  const accounts=useNewsroomResource<Account[]>(session.data,'admin/accounts',session.data?.role==='ADMIN');
  const [selected,setSelected]=useState('');
  const staff=accounts.data?.filter(account=>['EDITOR','REPORTER'].includes(account.role)) ?? [];
  const current=staff.find(account=>account.id===selected) ?? staff[0];
  return <AdminWorkspace title="Staff workflows" active="workflows"><div className="admin-form-grid">
    <section className="admin-card"><h2>Employee controls</h2><p>Admin uses the short publishing workflow. Set individual editorial requirements for each editor and reporter here.</p>
      <div className="cms-form"><label>Employee<select value={current?.id ?? ''} onChange={event=>setSelected(event.target.value)}>
        {staff.map(account=><option value={account.id} key={account.id}>{account.displayName} · {account.role.toLowerCase()}</option>)}
      </select></label></div>
      {accounts.error && <p role="alert">{accounts.error.message}</p>}
    </section>
    {current ? <EmployeeWorkflow account={current} key={current.id} /> : <section className="admin-card"><h2>No employees yet</h2><p>Create an Editor or Reporter account from Team & readers.</p></section>}
  </div></AdminWorkspace>;
}
