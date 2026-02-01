import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { SearchModal } from "./SearchModal";
import { getTrendingCoins } from "@/lib/coingecko.actions";

async function Header() {
    const trendingCoins = await getTrendingCoins();
    
  return (
    <header>
        <div className = "main-container inner">
            <Link href="/">
                <Image src="/logo.svg" alt="Coinpulse logo" width={132} height={40} />
            </Link>

            <nav>
                <Link href="/" className={cn('nav-link', {
                    'is-active' : false,
                    'is-home' : true
                })}>Home </Link>

                <SearchModal initialTrendingCoins={trendingCoins} />

                <Link href="/coins" className={cn('nav-link', {
                    'is-active' : false,
                })}>All Coins </Link>
            </nav>
        </div>
    </header>
  )
}

export default Header