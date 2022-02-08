/**
 * Promesse avec récupération et mise en cache du json de réponse
 * @see {@link JsonCache} pour le comportement de récuperation et mise en cache
 */
class CachedPromise {
    /**
     * @param {string} cacheName - nom du cache
     * @param {Promise} promise - promise à récuperer les données
     */
    constructor(cacheName, promise) {
        this.name = cacheName;
        this.promise = promise;
    }

    /**
     * Récupération des données en cache
     * @param {function<object|Boolean>} executer - fonction executé avec les données en cache
     * @return {Promise<object|Boolean>} Resultat de la promesse après comparaison avec données en cache
     */
    cached(executer){
        return JsonCache.find(this.name)
            .then(executer)
            .then(()=> this.promise.then(res => JsonCache.checkAndUpdate(this.name, res)));
    }

    /**
     * Récupération des données en cache pour une collection des CachedPromise
     * @param {CachedPromise[]} cachedPromises
     * @return {CachedPromiseCollection} Collection des promesses avec vérification et mise en place du cache
     * @example
     *      CachedPromise.all([
     *          new CachedPromise("json1", Promise),
     *          new CachedPromise("json2", Promise)
     *      ])
     *      .cached(jsonCacheCollection => console.log("Array des JSON en cache", jsonCacheCollection))
     *      .then(jsonReponseCollection => console.log("Array des JSON de reponse", jsonReponseCollection))
     */
    static all(cachedPromises){

        // vérification des promesses
        if(!Array.isArray(cachedPromises) || !cachedPromises.length || cachedPromises.some(cp => !(cp instanceof CachedPromise))){
            throw new Error("InvalidArgumentException : required CachedPromise[]");
        }

        /**
         * @class CachedPromiseCollection
         * @param {CachedPromise[]} promises - collection des promesses
         */
        function CachedPromiseCollection(promises){
            this.promises = promises;
        }

        /**
         * @param {function<Iterable<Object|Boolean>>} executer - fonction executé avec la collection des données en cache
         * @return {Promise<Iterable<Object|Boolean>>} Resultat des promesses après comparaison avec données en cache
         */
        CachedPromiseCollection.prototype.cached = function(executer){
            return Promise.all(this.promises.map(cp => JsonCache.find(cp.name)))
                .then(executer)
                .then(()=>{
                    return Promise.all(this.promises.map(cp => {
                        return cp.promise.then(res => JsonCache.checkAndUpdate(cp.name, res));
                    }));
                });
        }
        return new CachedPromiseCollection(cachedPromises);
    }
}
