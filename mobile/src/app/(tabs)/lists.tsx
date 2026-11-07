import { useRouter } from "expo-router";
import { ClockCounterClockwise, ListChecks, Plus } from "phosphor-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import { occasionTypes, type Occasion } from "@web/occasions";
import { useCopy } from "@/copy";
import { useStore } from "@/data/StoreProvider";
import { findList, myLists } from "@/data/store";
import type { Registry } from "@/data/types";
import { space } from "@/theme/tokens";
import { Card, Empty, Section } from "@/ui/bits";
import { Button } from "@/ui/Button";
import { Chip } from "@/ui/Chip";
import { ListCard } from "@/ui/domain";
import { occasionIcons } from "@/ui/icons";
import { Screen } from "@/ui/Screen";
import { Segmented } from "@/ui/Segmented";
import { T } from "@/ui/Text";

export default function Lists() {
  const router = useRouter();
  const { state } = useStore();
  const k = useCopy();
  const [tab, setTab] = useState<"mine" | "opened">("mine");
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const mine = myLists(state);
  const opened = state.visited.map((s) => findList(state, s)).filter((l): l is Registry => !!l && l.ownerId !== state.user?.id && l.status === "PUBLISHED");
  const publicLists = state.registries.filter((r) => r.status === "PUBLISHED" && r.visibility === "PUBLIC" && (!occasion || r.type === occasion));

  return (
    <Screen inTabs title={k.t.lists.title}>
      <View style={{ gap: space.xl }}>
        {state.user ? (
          <View style={{ gap: space.md }}>
            <Segmented label={k.t.lists.title} value={tab} onChange={setTab} options={[{ key: "mine", label: k.t.lists.mine }, { key: "opened", label: k.t.lists.opened }]} />
            <Animated.View key={tab} entering={FadeIn.duration(180)} style={{ gap: space.sm }}>
              {tab === "mine" ? (
                mine.length ? (
                  <>
                    {mine.map((l) => <ListCard key={l.slug} list={l} />)}
                    <Button kind="secondary" icon={Plus} label={k.shell.newList} onPress={() => router.push("/create")} />
                  </>
                ) : (
                  <Empty icon={ListChecks} title={k.home.noListsTitle} text={k.home.noListsText}>
                    <Button icon={Plus} label={k.shell.newList} onPress={() => router.push("/create")} />
                  </Empty>
                )
              ) : opened.length ? (
                opened.map((l) => <ListCard key={l.slug} list={l} />)
              ) : (
                <Empty icon={ClockCounterClockwise} text={k.t.lists.openedEmpty} />
              )}
            </Animated.View>
          </View>
        ) : (
          <Card style={{ gap: space.sm }}>
            <T variant="heading">{k.t.lists.signedOutTitle}</T>
            <T color="muted">{k.t.lists.signedOutText}</T>
            <Button label={k.t.account.signIn} onPress={() => router.push("/sign-in")} style={{ marginTop: space.xs }} />
          </Card>
        )}

        <Section title={k.home.finderPublic}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
            <Chip label={k.t.gifts.categories.all} selected={!occasion} onPress={() => setOccasion(null)} />
            {occasionTypes.map((o) => (
              <Chip key={o} icon={occasionIcons[o]} label={k.occasion(o)} selected={occasion === o} onPress={() => setOccasion(occasion === o ? null : o)} />
            ))}
          </ScrollView>
          {publicLists.length ? publicLists.map((l) => (
            <Animated.View key={l.slug} layout={LinearTransition} entering={FadeIn}>
              <ListCard list={l} />
            </Animated.View>
          )) : <T color="muted">{k.home.finderNone}</T>}
        </Section>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -space.md },
  chips: { paddingHorizontal: space.md, gap: space.xs },
});
