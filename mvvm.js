class Register {
    constructor() {
        this.routes = []
    }

    regist(obj, k, fn) {
        const _i = this.routes.find(function(el) {
            if ((el.key === k || el.key.toString() === k.toString()) &&
                Object.is(el.obj, obj)) {
                return el
            }
        })
        if (_i) {
            _i.fn.push(fn)
        } else {
            this.routes.push({
                obj: obj,
                key: k,
                fn: [fn]
            })
        }
    }

    build() {
        this.routes.forEach((route) => {
            observer(route.obj, route.key, route.fn)
        })
    }
}

class Parser {
    constructor(el, data, elist) {
        this._data = data
        this.$register = new Register()
        this.$el = document.querySelector(el)
        this.$elist = elist
        this.$frag = this.node2Fragment(this.$el)
        this.scan(this.$frag)
        this.$el.appendChild(this.$frag)
        this.$register.build()
    }

    node2Fragment(el) {
        const fragment = document.createDocumentFragment()
        let child = el.firstChild
        while (child) {
            fragment.appendChild(child)
            child = el.firstChild
        }
        return fragment
    }

    scan(node) {
        if (node === this.$frag || !node.getAttribute('data-list')) {
            for (let i = 0; i < node.children.length; i++) {
                const _thisNode = node.children[i]
                if (node.path) {
                    _thisNode.path = node.path
                }
                this.parseEvent(_thisNode)
                this.parseClass(_thisNode)
                this.parseModel(_thisNode)
                if (_thisNode.children.length) {
                    this.scan(_thisNode)
                }
            }
        } else {
            this.parseList(node)
        }
    }

    parseData(str, node) {
        const _list = str.split(':')
        let _data,
            _path,
            _j = 1
        let p = []
        _list.forEach((key, index) => {
            if (index === 0) {
                _data = this._data[key]
                p.push(key)
            } else {
                if (node.path) {
                    _path = node.path[_j++]
                    if (_path === key) {
                        _data = _data[key]
                    } else {
                        p.push(_path)
                        _data = _data[_path][key]
                        _j++
                    }
                } else {
                    _data = _data[key]
                }
                p.push(key)
            }
        })
        if (node.path && node.path.length > p.length) {
            const _i = node.path[node.path.length - 1]
            if (typeof _i !== 'number') {
                return
            }
            _data = _data[_i]
            p.push(_i)
        }
        if (!node.path || node.path !== p) {
            node.path = p
        }
        return {
            path: p,
            data: _data
        }
    }

    parseEvent(node) {
        if (node.getAttribute('data-event')) {
            const eventName = node.getAttribute('data-event')
            const _type = this.$elist[eventName].type
            const _fn = this.$elist[eventName].fn.bind(node)
            if (_type === 'input') {
                let cmp = false
                node.addEventListener('compositionstart', function() {
                    cmp = true
                })
                node.addEventListener('compositionend', function() {
                    cmp = false
                    node.dispatchEvent(new Event('input'))
                })
                node.addEventListener('input', function() {
                    if (!cmp) {
                        let start = this.selectionStart
                        let end = this.selectionEnd
                        _fn()
                        this.setSelectionRange(start, end)
                    }
                })
            } else {
                node.addEventListener(_type, _fn)
            }
        }
    }

    parseClass(node) {
        if (node.getAttribute('data-class')) {
            const className = node.getAttribute('data-class')
            const _data = this.parseData(className, node)
            if (!node.classList.contains(_data.data)) {
                node.classList.add(_data.data)
            }
            this.$register.regist(this._data, _data.path, function(old, now) {
                node.classList.remove(old)
                node.classList.add(now)
            })
        }
    }

    parseModel(node) {
        if (node.getAttribute('data-model')) {
            const modelName = node.getAttribute('data-model')
            const _data = this.parseData(modelName, node)
            if (node.tagName === 'INPUT') {
                node.value = _data.data
            } else {
                node.innerText = _data.data
            }
            this.$register.regist(this._data, _data.path, function(old, now) {
                if (node.tagName === 'INPUT') {
                    node.value = now
                } else {
                    node.innerText = now
                }
            })
        }
    }

    parseList(node) {
        const _item = this.parseListItem(node)
        const _list = node.getAttribute('data-list')
        const _listData = this.parseData(_list, node)
        _listData.data.forEach((_dataItem, index) => {
            const _copyItem = _item.cloneNode(true)
            if (node.path) {
                _copyItem.path = node.path.slice()
            }
            if (!_copyItem.path) {
                _copyItem.path = []
            }
            _copyItem.path.push(index)
            this.scan(_copyItem)
            node.insertBefore(_copyItem, _item)
        })
        node.removeChild(_item)
        this.$register.regist(this._data, _listData.path, () => {
            while (node.firstChild) {
                node.removeChild(node.firstChild)
            }
            const _listData = this.parseData(_list, node)
            node.appendChild(_item)
            _listData.data.forEach((_dataItem, index) => {
                const _copyItem = _item.cloneNode(true)
                if (node.path) {
                    _copyItem.path = node.path.slice()
                }
                if (!_copyItem.path) {
                    _copyItem.path = []
                }
                _copyItem.path.push(index)
                this.scan(_copyItem)
                node.insertBefore(_copyItem, _item)
            })
            node.removeChild(_item)
        })
    }

    parseListItem(node) {
        const me = this
        let target;
        ! function getItem(node) {
            for (let i = 0; i < node.children.length; i++) {
                const _thisNode = node.children[i]
                if (node.path) {
                    _thisNode.path = node.path.slice()
                }
                me.parseEvent(_thisNode)
                me.parseClass(_thisNode)
                me.parseModel(_thisNode)
                if (_thisNode.getAttribute('data-list-item')) {
                    target = _thisNode
                } else {
                    getItem(_thisNode)
                }
            }
        }(node)
        return target
    }
}

function observer(obj, k, callback) {
    if (Object.prototype.toString.call(k) === '[object Array]') {
        observePath(obj, k, callback)
    } else {
        let old = obj[k]
        if (Object.prototype.toString.call(old) === '[object Array]') {
            observeArray(old, callback)
        } else if (old.toString() === '[object Object]') {
            observeAllKey(old, callback)
        } else {
            Object.defineProperty(obj, k, {
                enumerable: true,
                configurable: true,
                get: function() {
                    return old
                },
                set: function(now) {
                    if (now !== old) {
                        callback.forEach((fn) => {
                            fn(old, now)
                        })
                    }
                    old = now
                }
            })
        }
    }
}

function observePath(obj, path, callback) {
    let _path = obj
    let _key
    path.forEach((p, index) => {
        if (parseInt(p) === p) {
            p = parseInt(p)
        }
        if (index < path.length - 1) {
            _path = _path[p]
        } else {
            _key = p
        }
    })
    observer(_path, _key, callback)
}

function observeArray(arr, callback) {
    const oam = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
    const arrayProto = Array.prototype
    const hackProto = Object.create(Array.prototype)
    oam.forEach(function(method) {
        Object.defineProperty(hackProto, method, {
            writable: true,
            enumerable: true,
            configurable: true,
            value: function(...arg) {
                let old = arr.slice()
                let now = arrayProto[method].call(this, ...arg)
                callback.forEach((fn) => {
                    fn(old, this, ...arg)
                })
                return now
            },
        })
    })
    arr.__proto__ = hackProto
}

function observeAllKey(obj, callback) {
    Object.keys(obj).forEach(function(key) {
        observer(obj, key, callback)
    })
}