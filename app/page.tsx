"use client";

import { useState, useEffect } from "react";
import { Camera, RefreshCw, ShoppingCart, Check, ListChecks, Heart, Users, Clock, Flame, BookOpen, CalendarDays, MapPin, ExternalLink, FileText, Trash2, X, Sparkles, ShieldAlert, Calendar, Plus, Tag, LogIn, LogOut, Lock } from "lucide-react";

// ----------------------------------------------------
// 許可設定（共通パスワードと許可するメールアドレスのリスト）
// ----------------------------------------------------
const ALLOWED_EMAILS = [
  "hira1916.hare@gmail.com",
  "hiraishi19.16_.ryu.2@icloud.com", // 追加の許可アドレス
];
const COMMON_PASSWORD = "7240"; // 共通パスワード

interface FlyerItem {
  storeName?: string;
  saleDate: string;
  name: string;
  category: string;
  price?: string;
  discount?: string;
}

interface Ingredient {
  name: string;
  amount: string;
}

interface BatchInstruction {
  prepStep: string;
  cookStep: string;
}

interface MenuItem {
  id: string;
  recipeTitle: string;
  description: string;
  cookingTime: string;
  difficulty: string;
  tips: string;
  steps: string[];
  batchInstruction?: BatchInstruction;
  targetItemsUsed: string[];
  allIngredients: Ingredient[];
}

interface Store {
  name: string;
  address: string;
  distance?: string;
  mapUrl: string;
  flyerSearchUrl: string;
  rating?: number;
  userRatingsTotal?: number;
  category?: string;
  openNow?: boolean | null;
}

const COMMON_ALLERGIES = ["卵", "乳製品", "小麦", "えび", "かに", "そば", "落花生"];

export default function Home() {
  // ----------------------------------------------------
  // 認証関連のステート
  // ----------------------------------------------------
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<"store" | "flyer" | "menu" | "shopping" | "recipe">("store");

  const [images, setImages] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [flyerItems, setFlyerItems] = useState<FlyerItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // 入力条件
  const [fridgeInput, setFridgeInput] = useState("");
  const [moodInput, setMoodInput] = useState("");
  const [shoppingDateInput, setShoppingDateInput] = useState("");
  const [servingsCount, setServingsCount] = useState(2);
  const [daysCount, setDaysCount] = useState(1);
  const [selectedStoresForShopping, setSelectedStoresForShopping] = useState<string[]>([]);
  
  // アレルギー・NG食材設定
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customNgInput, setCustomNgInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [generatingMenu, setGeneratingMenu] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuList, setMenuList] = useState<MenuItem[]>([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  
  // レシピ表示モード
  const [recipeMode, setRecipeMode] = useState<"individual" | "batch">("individual");

  // 位置情報・周辺店舗・お気に入り店舗
  const [locLoading, setLocLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [favorites, setFavorites] = useState<Store[]>([]);
  
  // 周辺店舗の折りたたみ管理
  const [showAllStores, setShowAllStores] = useState(false);

  useEffect(() => {
    try {
      // ログイン状態の保持確認
      const savedAuth = localStorage.getItem("app_is_logged_in");
      if (savedAuth === "true") setIsLoggedIn(true);

      const savedAllergies = localStorage.getItem("app_selected_allergies");
      const savedCustomNg = localStorage.getItem("app_custom_ng");
      const savedFavs = localStorage.getItem("favorite_stores");

      if (savedAllergies) setSelectedAllergies(JSON.parse(savedAllergies));
      if (savedCustomNg) setCustomNgInput(savedCustomNg);
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }, []);

  // ----------------------------------------------------
  // 認証ハンドラー
  // ----------------------------------------------------
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const trimmedEmail = loginEmail.trim().toLowerCase();

    // 1. メールアドレスのチェック
    if (!ALLOWED_EMAILS.map((e) => e.toLowerCase()).includes(trimmedEmail)) {
      setAuthError("このメールアドレスはアクセスが許可されていません。");
      return;
    }

    // 2. 共通パスワードのチェック
    if (loginPassword !== COMMON_PASSWORD) {
      setAuthError("パスワードが正しくありません。");
      return;
    }

    // 認証成功
    setIsLoggedIn(true);
    localStorage.setItem("app_is_logged_in", "true");
    setLoginPassword("");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("app_is_logged_in");
  };

  const toggleFavorite = (store: Store) => {
    let updated: Store[];
    const exists = favorites.some((f) => f.name === store.name);
    if (exists) {
      updated = favorites.filter((f) => f.name !== store.name);
    } else {
      updated = [...favorites, store];
    }
    setFavorites(updated);
    try {
      localStorage.setItem("favorite_stores", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save favorites", e);
    }
  };

  const toggleAllergy = (item: string) => {
    const updated = selectedAllergies.includes(item)
      ? selectedAllergies.filter((a) => a !== item)
      : [...selectedAllergies, item];
    setSelectedAllergies(updated);
    try {
      localStorage.setItem("app_selected_allergies", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save allergies", e);
    }
  };

  const handleCustomNgChange = (value: string) => {
    setCustomNgInput(value);
    try {
      localStorage.setItem("app_custom_ng", value);
    } catch (e) {
      console.error("Failed to save custom NG ingredients", e);
    }
  };

  const handleGetLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("お使いのブラウザは位置情報に対応していません。");
      return;
    }

    setLocLoading(true);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    };

    navigator.geolocation.getCurrentPosition(
      async (position: GeolocationPosition) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const res = await fetch("/api/nearby-stores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });
          
          const data = await res.json();
          if (data.stores && data.stores.length > 0) {
            setStores(data.stores);
          } else {
            alert("近くに該当する店舗が見つかりませんでした。");
          }
        } catch (error) {
          console.error("店舗取得エラー:", error);
        } finally {
          setLocLoading(false);
        }
      },
      (error: GeolocationPositionError) => {
        console.error(error);
        alert("位置情報の取得に失敗しました。端末の位置情報（GPS）がオンになっているかご確認ください。");
        setLocLoading(false);
      },
      options
    );
  };

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const maxWidth = 1000;
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(blobUrl);
            reject(new Error("Canvas作成エラー"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          URL.revokeObjectURL(blobUrl);
          resolve(compressedBase64);
        } catch (err) {
          URL.revokeObjectURL(blobUrl);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error("画像読み込みエラー"));
      };
      img.src = blobUrl;
    });
  };

  const handleMultipleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const compressedList = await Promise.all(
        Array.from(files).map((f) => processImageFile(f))
      );
      setImages((prev) => [...prev, ...compressedList]);
      setFlyerItems([]);
      setSelectedItems([]);
      setMenuList([]);
      setSelectedMenuIds([]);
    } catch (error) {
      console.error("画像処理エラー:", error);
      alert("画像の読み込みに失敗しました。");
    }
  };

  const handleAnalyzeAll = async () => {
    if (images.length === 0) return;
    setAnalyzing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await res.json();

      if (data.items) {
        setFlyerItems(data.items);
        setSelectedItems(data.items.map((item: FlyerItem) => item.name));
        
        const extractedStores = Array.from(
          new Set(data.items.map((item: FlyerItem) => item.storeName || "対象店舗"))
        ) as string[];
        setSelectedStoresForShopping(extractedStores);
      } else {
        alert("特売品を読み取れませんでした。");
      }
    } catch (err) {
      console.error(err);
      alert("解析中にエラーが発生しました。");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleItem = (name: string) => {
    setSelectedItems((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const handleGenerateMenu = async () => {
    if (selectedItems.length === 0) {
      alert("特売品を1つ以上選択してください。");
      return;
    }

    setGeneratingMenu(true);
    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedItems,
          selectedStores: selectedStoresForShopping,
          fridgeItems: fridgeInput,
          mood: moodInput,
          shoppingDate: shoppingDateInput,
          servings: servingsCount,
          days: daysCount,
          allergies: selectedAllergies,
          customNg: customNgInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(`エラー: ${data.error || "献立を作成できませんでした"}`);
        return;
      }

      if (data.menu && Array.isArray(data.menu)) {
        const menusWithId = data.menu.map((item: any, index: number) => ({
          ...item,
          id: `menu-${index}-${Date.now()}`,
        }));
        setMenuList(menusWithId);
        setSelectedMenuIds([]);
        setActiveTab("menu");
      }
    } catch (err: any) {
      console.error(err);
      alert(`通信エラー: ${err.message}`);
    } finally {
      setGeneratingMenu(false);
    }
  };

  const handleLoadMoreMenu = async () => {
    setLoadingMore(true);
    try {
      const existingTitles = menuList.map((m) => m.recipeTitle);
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedItems,
          selectedStores: selectedStoresForShopping,
          fridgeItems: fridgeInput,
          mood: moodInput,
          shoppingDate: shoppingDateInput,
          servings: servingsCount,
          days: daysCount,
          allergies: selectedAllergies,
          customNg: customNgInput,
          existingTitles,
        }),
      });

      const data = await res.json();
      if (data.menu && Array.isArray(data.menu)) {
        const newMenusWithId = data.menu.map((item: any, index: number) => ({
          ...item,
          id: `menu-more-${index}-${Date.now()}`,
        }));
        setMenuList((prev) => [...prev, ...newMenusWithId]);
      }
    } catch (err) {
      console.error("追加献立の取得エラー:", err);
      alert("新しい献立の取得に失敗しました。");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleMenuSelection = (id: string) => {
    setSelectedMenuIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getAggregatedShoppingList = () => {
    const selectedMenus = menuList.filter((m) => selectedMenuIds.includes(m.id));
    const aggregated: Record<string, string[]> = {};

    selectedMenus.forEach((menu) => {
      (menu.allIngredients || []).forEach((ing) => {
        if (!ing.name) return;
        if (!aggregated[ing.name]) aggregated[ing.name] = [];
        if (ing.amount) aggregated[ing.name].push(ing.amount);
      });
    });

    return Object.entries(aggregated).map(([name, amounts]) => ({
      name,
      amounts: amounts.join(" + ") || "適量",
    }));
  };

  const shoppingList = getAggregatedShoppingList();
  const selectedMenus = menuList.filter((m) => selectedMenuIds.includes(m.id));
  const totalAllergyCount = selectedAllergies.length + (customNgInput.trim() ? 1 : 0);

  const groupedByStore = flyerItems.reduce((acc, item) => {
    const store = item.storeName || "対象店舗";
    if (!acc[store]) acc[store] = [];
    acc[store].push(item);
    return acc;
  }, {} as Record<string, FlyerItem[]>);

  const allStoresInFlyer = Object.keys(groupedByStore);

  // ----------------------------------------------------
  // 未ログイン時のログイン画面表示
  // ----------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-800">チラシ要約＆献立アシスト</h1>
            <p className="text-xs text-slate-500">認証されたユーザーのみご利用いただけます</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-bold">
                {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">メールアドレス</label>
              <input
                type="email"
                required
                placeholder="登録済みのメールアドレス"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">共通パスワード</label>
              <input
                type="password"
                required
                placeholder="共通パスワードを入力"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
            >
              <LogIn className="w-4 h-4" />
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-28">
      {/* ヘッダー */}
      <header className="bg-emerald-600 text-white p-4 sticky top-0 z-10 shadow-md flex justify-between items-center">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          チラシ要約＆献立アシスト
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-500 transition-all"
          >
            <ShieldAlert className="w-4 h-4 text-amber-300" />
            <span>NG設定</span>
            {totalAllergyCount > 0 && (
              <span className="bg-amber-400 text-slate-900 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
                {totalAllergyCount}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            title="ログアウト"
            className="p-1.5 bg-emerald-700 hover:bg-emerald-800 rounded-lg border border-emerald-500 text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* NG設定パネル */}
        {showSettings && (
          <div className="bg-white p-5 rounded-xl shadow-md border-2 border-amber-300 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                アレルギー・NG食材の設定
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-xs text-slate-400 hover:text-slate-600">
                閉じる ✕
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">主要アレルギー品目</label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGIES.map((item) => {
                  const isSelected = selectedAllergies.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleAllergy(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        isSelected
                          ? "bg-red-500 text-white border-red-600 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {item} {isSelected && "✕"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">自由入力（苦手な食材等）</label>
              <input
                type="text"
                placeholder="例: にんじん, 辛いもの"
                value={customNgInput}
                onChange={(e) => handleCustomNgChange(e.target.value)}
                className="w-full p-2 border rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
          </div>
        )}

        {/* TAB 1: 店舗検索 */}
        {activeTab === "store" && (
          <div className="space-y-6">
            {favorites.length > 0 && (
              <div className="bg-white p-4 rounded-xl shadow-sm border border-rose-200 space-y-2">
                <h2 className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  お気に入り店舗 ({favorites.length})
                </h2>
                <div className="space-y-2">
                  {favorites.map((store, idx) => (
                    <div key={`fav-${idx}`} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs text-slate-900 truncate">{store.name}</h3>
                        <p className="text-[10px] text-slate-500 truncate">{store.address}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={store.flyerSearchUrl} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-sm">
                          チラシ <ExternalLink className="w-3 h-3" />
                        </a>
                        <button onClick={() => toggleFavorite(store)} className="p-1 text-slate-400 hover:text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  近所のスーパーを探す
                </h2>
              </div>
              {stores.length === 0 ? (
                <button onClick={handleGetLocation} disabled={locLoading} className="w-full py-3 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-xs">
                  {locLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {locLoading ? "位置情報から検索中..." : "位置情報から周辺店舗を表示"}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>周辺のスーパーマーケット ({stores.length}件)</span>
                    <button onClick={handleGetLocation} className="text-emerald-600 font-bold hover:underline flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> 再検索
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {(showAllStores ? stores : stores.slice(0, 3)).map((store, idx) => {
                      const isFav = favorites.some((f) => f.name === store.name);
                      return (
                        <div key={idx} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-emerald-500 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-sm text-slate-900">{store.name}</h3>
                                <button onClick={() => toggleFavorite(store)}>
                                  <Heart className={`w-4 h-4 ${isFav ? "text-rose-500 fill-rose-500" : "text-slate-300"}`} />
                                </button>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{store.address}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <a href={store.mapUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 rounded-lg border">
                              地図で開く
                            </a>
                            <a href={store.flyerSearchUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 rounded-lg shadow-sm">
                              チラシを見る ↗
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {stores.length > 3 && (
                    <button
                      onClick={() => setShowAllStores(!showAllStores)}
                      className="w-full py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1 border border-slate-200"
                    >
                      {showAllStores ? <>閉じる ▴</> : <>もっと見る（残り {stores.length - 3} 件）▾</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: チラシ解析 */}
        {activeTab === "flyer" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                チラシ・スクショの読み込み（複数枚可）
              </h2>

              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 my-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-300 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`Flyer preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages(images.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-5 cursor-pointer hover:bg-slate-50 transition-colors">
                <Camera className="w-7 h-7 text-emerald-600 mb-1" />
                <span className="text-xs font-bold text-slate-700">写真・スクショを追加選択</span>
                <span className="text-[10px] text-slate-400 mt-0.5">※複数枚を同時に選択できます</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleMultipleImagesChange}
                  className="hidden"
                />
              </label>

              {images.length > 0 && flyerItems.length === 0 && (
                <button
                  onClick={handleAnalyzeAll}
                  disabled={analyzing}
                  className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg shadow hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {images.length}枚のチラシをAI解析中...
                    </>
                  ) : (
                    `選択した ${images.length} 枚のチラシをまとめて読み取る`
                  )}
                </button>
              )}
            </div>

            {flyerItems.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="font-bold text-base text-slate-800">抽出された特売品</h2>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
                    {selectedItems.length} / {flyerItems.length} 件選択中
                  </span>
                </div>

                {Object.entries(groupedByStore).map(([storeName, storeItems]) => (
                  <div key={storeName} className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      店舗: <span className="text-emerald-800">{storeName}</span>
                    </h3>

                    {Object.entries(
                      storeItems.reduce((acc, item) => {
                        const date = item.saleDate || "全日";
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(item);
                        return acc;
                      }, {} as Record<string, FlyerItem[]>)
                    ).map(([dateGroup, items]) => (
                      <div key={dateGroup} className="space-y-2">
                        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 pl-1">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {dateGroup}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {items.map((item, idx) => {
                            const isSelected = selectedItems.includes(item.name);
                            return (
                              <div
                                key={idx}
                                onClick={() => toggleItem(item.name)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? "border-emerald-500 bg-white shadow-sm"
                                    : "border-slate-200 opacity-60 bg-slate-100 hover:opacity-80"
                                }`}
                              >
                                <div className="space-y-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[9px] bg-slate-200 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                                      {item.category || "食品"}
                                    </span>
                                    {/* 値引きバッジ */}
                                    {item.discount && (
                                      <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-red-200">
                                        <Tag className="w-2.5 h-2.5" />
                                        {item.discount}
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-bold text-slate-800 text-xs truncate">{item.name}</p>
                                  {/* 特売価格表示 */}
                                  {item.price && (
                                    <p className="text-xs font-extrabold text-red-600">
                                      {item.price}
                                    </p>
                                  )}
                                </div>
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 ${isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                <div className="pt-4 border-t space-y-4">
                  {allStoresInFlyer.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        今回買い物に行く店舗の選択
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {allStoresInFlyer.map((store) => {
                          const isSelected = selectedStoresForShopping.includes(store);
                          return (
                            <button
                              key={store}
                              onClick={() => {
                                setSelectedStoresForShopping((prev) =>
                                  isSelected ? prev.filter((s) => s !== store) : [...prev, store]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                isSelected
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {store} {isSelected && "✓"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-pink-500" />
                      今日の気分・希望（任意）
                    </label>
                    <input
                      type="text"
                      placeholder="例: さっぱり系, 時短15分以内, 子供が好きな味付け"
                      value={moodInput}
                      onChange={(e) => setMoodInput(e.target.value)}
                      className="w-full p-2.5 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      冷蔵庫にあるもの（買い物リストから除外）
                    </label>
                    <input
                      type="text"
                      placeholder="例: 卵, 豆腐, キャベツ半分, 醤油"
                      value={fridgeInput}
                      onChange={(e) => setFridgeInput(e.target.value)}
                      className="w-full p-2.5 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                      買い物に行く日にち（任意）
                    </label>
                    <input
                      type="text"
                      placeholder="例: 今日, 明日, 9/15(火), 週末"
                      value={shoppingDateInput}
                      onChange={(e) => setShoppingDateInput(e.target.value)}
                      className="w-full p-2.5 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600" />
                      何人分を作る？
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setServingsCount(num)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            servingsCount === num
                              ? "bg-emerald-600 text-white border-emerald-600 shadow"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {num}人分
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      何日分の献立を作る？
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setDaysCount(num)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                            daysCount === num
                              ? "bg-emerald-600 text-white border-emerald-600 shadow"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {num}日分
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateMenu}
                    disabled={generatingMenu || selectedItems.length === 0}
                    className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-lg shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {generatingMenu ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        献立を作成中...
                      </>
                    ) : (
                      "選択した商品で献立を作成する"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 提案献立 */}
        {activeTab === "menu" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">作りたい献立（複数選択可）を選んでください</p>
                <p className="text-emerald-700 mt-0.5">
                  全 {menuList.length} 件の提案を表示中
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuList.map((m) => {
                const isSelected = selectedMenuIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleMenuSelection(m.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 flex flex-col justify-between ${
                      isSelected
                        ? "bg-white border-2 border-emerald-600 shadow-md ring-2 ring-emerald-600/10"
                        : "bg-white border-slate-200 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2 border-b pb-2">
                        <h3 className="font-bold text-slate-800 text-sm leading-snug">{m.recipeTitle}</h3>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-all ${isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3 text-emerald-600" /> {m.cookingTime || "15分"}
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                          <Flame className="w-3 h-3 text-amber-500" /> 難易度: {m.difficulty || "簡単"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {m.tips && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-100 flex items-start gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>プロの一言:</strong> {m.tips}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4">
              <button
                onClick={handleLoadMoreMenu}
                disabled={loadingMore}
                className="w-full py-3.5 bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    新しい献立を探しています...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-emerald-600" />
                    さらに他の献立案をもっと見る
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: 買い物リスト */}
        {activeTab === "shopping" && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-emerald-600" />
              選択した献立に必要な全買い物リスト
            </h2>
            {shoppingList.length > 0 ? (
              <ul className="space-y-2">
                {shoppingList.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border text-xs">
                    <label className="flex items-center gap-2.5 cursor-pointer font-medium text-slate-800">
                      <input type="checkbox" className="w-4 h-4 accent-emerald-600 rounded" />
                      <span>{item.name}</span>
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                      {item.amounts}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center py-6 text-xs text-slate-500">献立が選択されていません。</p>
            )}
          </div>
        )}

        {/* TAB 5: レシピ */}
        {activeTab === "recipe" && (
          <div className="space-y-6">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" /> 調理モード切替
              </span>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setRecipeMode("individual")} className={`px-3 py-1 text-xs font-bold rounded-md ${recipeMode === "individual" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
                  1個ずつ作る
                </button>
                <button onClick={() => setRecipeMode("batch")} className={`px-3 py-1 text-xs font-bold rounded-md ${recipeMode === "batch" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
                  まとめて作る（効率調理）
                </button>
              </div>
            </div>

            {recipeMode === "individual" ? (
              <div className="space-y-6">
                {selectedMenus.map((menu, idx) => (
                  <div key={menu.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
                    <div className="border-b pb-3">
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                        品目 {idx + 1}
                      </span>
                      <h3 className="text-base font-bold text-slate-800 mt-1.5">{menu.recipeTitle}</h3>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded w-fit">材料 ({servingsCount}人分 × {daysCount}日分)</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 p-2.5 bg-slate-50 rounded-lg">
                        {menu.allIngredients?.map((ing, i) => (
                          <div key={i} className="flex justify-between border-b pb-1">
                            <span>{ing.name}</span>
                            <span className="font-semibold text-slate-700">{ing.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded w-fit">作り方・手順</h4>
                      <ol className="space-y-2 text-xs text-slate-700">
                        {menu.steps?.map((step, i) => (
                          <li key={i} className="flex gap-2 bg-slate-50/50 p-2 rounded-lg border">
                            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-emerald-800 text-xs flex items-start gap-2.5 shadow-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold mb-0.5">効率調理モード</h4>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      複数の料理の下ごしらえをまとめて行い、一気に仕上げる時短手順です。
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs">
                      1
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm">まとめて下ごしらえ</h3>
                  </div>

                  <div className="space-y-2.5">
                    {selectedMenus.map((m, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                            {m.recipeTitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed pt-1">
                          {m.batchInstruction?.prepStep || "材料を切り揃えます。"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      2
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm">一気に調理・盛り付け</h3>
                  </div>

                  <div className="space-y-2.5">
                    {selectedMenus.map((m, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[11px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {m.recipeTitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed pt-1">
                          {m.batchInstruction?.cookStep || "加熱・盛り付けをします。"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ボトムナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-20">
        <div className="max-w-2xl mx-auto grid grid-cols-5 h-16">
          <button onClick={() => setActiveTab("store")} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === "store" ? "text-emerald-600 font-bold" : "text-slate-500"}`}>
            <MapPin className="w-5 h-5" />
            <span className="text-[10px]">店舗検索</span>
          </button>
          <button onClick={() => setActiveTab("flyer")} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === "flyer" ? "text-emerald-600 font-bold" : "text-slate-500"}`}>
            <Camera className="w-5 h-5" />
            <span className="text-[10px]">チラシ解析</span>
          </button>
          <button onClick={() => setActiveTab("menu")} disabled={menuList.length === 0} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === "menu" ? "text-emerald-600 font-bold" : "text-slate-500 disabled:opacity-30"}`}>
            <FileText className="w-5 h-5" />
            <span className="text-[10px]">提案</span>
          </button>
          <button onClick={() => setActiveTab("shopping")} disabled={selectedMenuIds.length === 0} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === "shopping" ? "text-emerald-600 font-bold" : "text-slate-500 disabled:opacity-30"}`}>
            <ListChecks className="w-5 h-5" />
            <span className="text-[10px]">リスト</span>
          </button>
          <button onClick={() => setActiveTab("recipe")} disabled={selectedMenuIds.length === 0} className={`flex flex-col items-center justify-center space-y-1 ${activeTab === "recipe" ? "text-emerald-600 font-bold" : "text-slate-500 disabled:opacity-30"}`}>
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px]">レシピ</span>
          </button>
        </div>
      </nav>
    </div>
  );
}