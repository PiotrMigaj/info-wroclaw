<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-y-2">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">W</div>
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white leading-none">Info Wrocław</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Wiadomości z Wrocławia podsumowane przez AI</p>
          </div>
        </div>
        <div v-if="nextRefreshIn" class="text-xs text-gray-400 dark:text-gray-500">
          Odświeżenie za {{ nextRefreshIn }}
        </div>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-8">
      <ClientOnly>
      <!-- Loading state -->
      <div v-if="status === 'pending'" class="space-y-6">
        <div class="text-center py-6">
          <div class="inline-flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <svg class="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="text-gray-700 dark:text-gray-200 font-medium text-center text-sm">Agenci AI pobierają wiadomości z Wrocławia…</span>
          </div>
        </div>
        <!-- Skeleton cards -->
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="i in 6" :key="i" class="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
            <div class="h-36 sm:h-44 bg-gray-200 dark:bg-gray-800" />
            <div class="p-5 space-y-3">
              <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div class="space-y-2">
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Błąd podczas ładowania wiadomości</h3>
          <p class="text-gray-500 dark:text-gray-400 mt-1 text-sm max-w-sm">{{ error.message }}</p>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500">Spróbuj ponownie za chwilę.</p>
      </div>

      <!-- News grid -->
      <div v-else-if="data?.news?.length">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ data.news.length }} artykułów &middot; Zaktualizowane przez agentów AI
          </p>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="cat in categories"
              :key="cat"
              @click="activeCategory = activeCategory === cat ? null : cat"
              :class="[
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-blue-400'
              ]"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="item in filteredNews"
            :key="item.url"
            class="group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 flex flex-col"
          >
            <!-- Image -->
            <div class="relative h-36 sm:h-44 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 overflow-hidden flex-shrink-0">
              <img
                v-if="item.imageUrl"
                :src="item.imageUrl"
                :alt="item.title"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <div v-else class="absolute inset-0 flex items-center justify-center">
                <svg class="w-12 h-12 text-blue-200 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <!-- Category badge -->
              <div class="absolute top-3 left-3">
                <span :class="['text-xs font-semibold px-2.5 py-1 rounded-full', categoryColor(item.category)]">
                  {{ item.category }}
                </span>
              </div>
            </div>

            <!-- Content -->
            <div class="p-5 flex flex-col flex-1">
              <h2 class="font-semibold text-gray-900 dark:text-white text-base leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {{ item.title }}
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1 line-clamp-3">
                {{ item.summary }}
              </p>
              <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 truncate">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span class="truncate">{{ item.source }}</span>
                </div>
                <a
                  :href="item.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0 ml-2"
                >
                  Czytaj więcej
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-gray-500 dark:text-gray-400">Nie znaleziono artykułów. Spróbuj odświeżyć.</p>
      </div>
      </ClientOnly>
    </main>

    <!-- Photographer promo -->
    <section class="max-w-5xl mx-auto px-4 pb-6">
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 px-6 py-5 flex items-center gap-5">
        <div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Twórca projektu</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">Anna Migaj — Fotograf</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">Sesje portretowe, ślubne i biznesowe. Architektura i estetyka w każdym kadrze.</p>
        </div>
        <a
          href="https://niebieskie-aparaty.pl/"
          target="_blank"
          rel="noopener noreferrer"
          class="flex-shrink-0 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
        >niebieskie-aparaty.pl →</a>
      </div>
    </section>

    <!-- Footer -->
    <footer class="text-center py-8 text-xs text-gray-400 dark:text-gray-600">
      Zasilane przez GPT-4o &amp; LangGraph &middot; Wiadomości odświeżane co 6 godzin
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { NewsItem } from '~~/shared/types'



const title = 'Info Wrocław – Wiadomości z Wrocławia'
const description = 'Najnowsze wiadomości z Wrocławia podsumowane przez agentów AI. Polityka, kultura, sport, infrastruktura i więcej – odświeżane co 6 godzin.'
const canonicalUrl = useRequestURL().origin

useHead({
  title,
  htmlAttrs: { lang: 'pl' },
  meta: [
    { name: 'description', content: description },
    { name: 'robots', content: 'index, follow' },
    // Open Graph
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:locale', content: 'pl_PL' },
    { property: 'og:site_name', content: 'Info Wrocław' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ],
  link: [
    { rel: 'canonical', href: canonicalUrl },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Info Wrocław',
        description,
        url: canonicalUrl,
        inLanguage: 'pl',
      }),
    },
  ],
})

const { data, status, error } = useLazyFetch('/api/news', { server: false })

const activeCategory = ref<string | null>(null)

const categories = computed(() => {
  if (!data.value?.news) return []
  return [...new Set(data.value.news.map((n: NewsItem) => n.category))].sort()
})

const filteredNews = computed(() => {
  if (!data.value?.news) return []
  if (!activeCategory.value) return data.value.news
  return data.value.news.filter((n: NewsItem) => n.category === activeCategory.value)
})

const nextRefreshIn = computed(() => {
  if (!data.value?.cachedAt) return null
  const ms = data.value.cachedAt - Date.now()
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h} godz. ${m} min.` : `${m} min.`
})

const categoryColors: Record<string, string> = {
  Polityka: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Sport: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Kultura: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Infrastruktura: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Biznes: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Wydarzenia: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  Bezpieczeństwo: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Inne: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

function categoryColor(cat: string): string {
  return categoryColors[cat] ?? categoryColors['Inne']!
}
</script>
