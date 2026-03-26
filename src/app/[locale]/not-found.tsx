import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <span className="text-6xl block mb-4">🔍</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Paj sa a pa egziste
        </h2>
        <p className="text-gray-500 mb-6">
          Paj ou ap chache a pa disponib. Verifye lyen an epi eseye ankò.
        </p>
        <Link href="/">
          <Button variant="gold">Retounen nan akèy</Button>
        </Link>
      </div>
    </div>
  );
}
