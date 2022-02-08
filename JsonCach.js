/**
 * Controller de récuperation et mise en cache de Json
 * CUSTOM_UID - ID de reference du cache
 */
class JsonCache {

    /**
     * @return {Promise<Cache>|Promise.reject} Cache ou promise reject si l'API caches n'est pas disponible
     */
    static open(){
        return Boolean(caches)
            ? caches.open(CUSTOM_UID)
            : Promise.reject(new Error("API Caches non disponibles"));
    }

    /**
     * Crée ou maj le cache
     * @param {string} cacheName - Nom du cache à créer
     * @param {object} json - json object à mettre en cache
     * @return {Promise<object>} Promesse avec le json mis en cache
     */
    static createOrUpdate(cacheName, json){
        return JsonCache.open().then( cache => {
            Object.assign(json, {cacheName: cacheName});
            const body = new Blob([JSON.stringify(json, null, 2)], {type : 'application/json'});
            const response = new Response(body, {status: 200,statusText: "cached result for " + cacheName});
            return cache.put(cacheName, response).then(()=> json);
        })
    }

    /**
     * Récupère un json en cache
     * @param {string} cacheName - Nom du cache
     * @return {Promise<object|Boolean>} Json en cache ou false si pas de cache
     */
    static find(cacheName){
        const request = new Request(cacheName);
        return JsonCache.open()
            // retrouve json en cache
            .then(cache => cache.match(request))
            // request body json OU log warn et retourne false
            .then(req => req ? req.json() : (console.warn("Aucun json en cache pour", cacheName) || false))
            .catch(error=>console.warn(error));
    }



    /**
     * Vérifie si un json est à jour avec la version en cache et maj le cache si besoin
     * - La comparaison est fait avec la comparaison des deux json en string (JSON.stringify)
     * @param {string} cacheName - Nom du cache
     * @param {object} json - json object à vérifier avec cache
     * @return {Promise<object|Boolean>}
     *      Promesse avec le json maj en cache ou false si le cache est à jour;
     *      Si l'API n'est pas disponible return Json sans mise en cache
     */
    static checkAndUpdate(cacheName, json){
        return JsonCache.find(cacheName)
            .then(jsonCached =>{
                // on re-crée un objet avec les données du json et on ajoute la clé du cacheName
                json = Object.assign({}, json, {cacheName});
                const cached = Object.assign({}, jsonCached);
                // si on a pas de json en cache ou les json en string sont differents
                return !jsonCached || JSON.stringify(json, null, 2) !== JSON.stringify(cached, null, 2);
            })
            // return false si le json est à jour ou maj le json en cache et return json
            .then(shouldUpdate => !shouldUpdate ? false : JsonCache.createOrUpdate(cacheName, json).then(cachedJson => cachedJson))
            // return json si erreur (API non disponible)
            .catch(()=> json);
    }
}
