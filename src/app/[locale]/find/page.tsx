import {getTranslations} from "next-intl/server";
import {FindRegistryForm} from "./FindRegistryForm";
export default async function FindRegistryPage(){
  const t=await getTranslations('header');
  return <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6"><h1 className="text-4xl text-gray-900">{t('findRegistry')}</h1><p className="mt-3 text-gray-700">{t('findIntro')}</p><FindRegistryForm/></div>;
}
