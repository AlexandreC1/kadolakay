"use client";
import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {findRegistryDestination} from "@/lib/find-registry-link";
export function FindRegistryForm(){
  const t=useTranslations('header');const router=useRouter();const [value,setValue]=useState('');const [error,setError]=useState(false);
  return <form className="mt-8 space-y-4" onSubmit={event=>{event.preventDefault();const destination=findRegistryDestination(value,window.location.origin);if(!destination){setError(true);return;}setError(false);router.push(destination);}}>
    <label htmlFor="registry-address" className="block text-sm font-semibold">{t('registryAddress')}</label>
    <p id="registry-help" className="text-sm text-gray-700">{t('registryHelp')}</p>
    <div className="flex flex-wrap gap-3"><input id="registry-address" value={value} onChange={event=>{setValue(event.target.value);if(error)setError(false);}} aria-invalid={error} aria-describedby={error?'registry-help registry-error':'registry-help'} maxLength={2048} required className="min-h-12 min-w-0 flex-1 rounded-xl border border-gray-300 bg-surface px-4 text-gray-900"/><button type="submit" className="min-h-12 rounded-full bg-gold-400 px-6 font-semibold text-brand-950">{t('openRegistry')}</button></div>
    {error&&<p id="registry-error" role="alert" className="text-sm text-red-300">{t('invalidRegistry')}</p>}
  </form>;
}
