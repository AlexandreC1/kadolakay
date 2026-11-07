import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle } from "phosphor-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useColors, useStore } from "@/data/StoreProvider";
import { findList } from "@/data/store";
import type { Visibility } from "@/data/types";
import { radius, space } from "@/theme/tokens";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Screen } from "@/ui/Screen";
import { Tap } from "@/ui/Tap";
import { T } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

export default function EditList() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = useColors();
  const router = useRouter();
  const toast = useToast();
  const { state, dispatch } = useStore();
  const k = useCopy();
  const list = findList(state, slug);
  const [title, setTitle] = useState(list?.title ?? "");
  const [date, setDate] = useState(list?.eventDate ?? "");
  const [place, setPlace] = useState(list?.place ?? "");
  const [note, setNote] = useState(list?.description ?? "");
  const [visibility, setVisibility] = useState<Visibility>(list?.visibility ?? "LINK");
  const [error, setError] = useState<{ title?: string; date?: string }>({});
  if (!list || list.ownerId !== state.user?.id) return null;

  const save = () => {
    const e = { title: title.trim() ? undefined : k.t.create.nameNeeded, date: !date || /^\d{4}-\d{2}-\d{2}$/.test(date) ? undefined : k.t.create.dateInvalid };
    setError(e);
    if (e.title || e.date) return;
    dispatch({ type: "updateList", slug: list.slug, patch: { title: title.trim(), eventDate: date || undefined, place: place.trim() || undefined, description: note.trim() || undefined, visibility } });
    toast(k.t.common.saved);
    router.back();
  };

  return (
    <Screen back title={k.t.list.edit} footer={<Button full label={k.t.common.save} onPress={save} />}>
      <View style={{ gap: space.lg }}>
        <Field label={k.t.create.name} value={title} onChangeText={setTitle} error={error.title} maxLength={100} />
        <Field label={k.t.create.date} optionalLabel={k.t.common.optional} value={date} onChangeText={setDate} placeholder={k.t.create.datePlaceholder} error={error.date} maxLength={10} />
        <Field label={k.t.create.place} optionalLabel={k.t.common.optional} value={place} onChangeText={setPlace} maxLength={80} />
        <Field label={k.t.create.note} optionalLabel={k.t.common.optional} value={note} onChangeText={setNote} multiline maxLength={1000} />
        <View style={{ gap: space.xs }}>
          <T variant="label" color="secondary">{k.t.create.who}</T>
          {(["PUBLIC", "LINK", "PRIVATE"] as const).map((v) => {
            const on = visibility === v;
            return (
              <Tap key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={k.t.visibility[v]} onPress={() => setVisibility(v)}
                style={[styles.choice, { borderColor: on ? c.accentInk : c.line, backgroundColor: on ? c.accentSoft : c.surface }]}>
                <View style={{ flex: 1 }}>
                  <T variant="bodyStrong">{k.t.visibility[v]}</T>
                  <T variant="caption" color="muted">{k.t.visibility[`${v}_hint`]}</T>
                </View>
                {on ? <CheckCircle size={22} color={c.accentInk} weight="fill" /> : null}
              </Tap>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choice: { flexDirection: "row", alignItems: "center", gap: space.sm, borderWidth: 1.5, borderRadius: radius.lg, padding: space.md },
});
