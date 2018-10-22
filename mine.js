class Register {
    constructor() {

    }
}

class Parser {
    constructor(el, data) {
        this.$data = data;
        this.$el = document.querySelector(el);
        this.$frag = this.getFragment(this.$el);
        this.scan(this.$frag);
        this.$el.appendChild(this.$frag)
    }
    getFragment(el) {
        //  创建一个html片段(避免反复渲染文档导致性能不好)
        var fragment = document.createDocumentFragment();
        var child = el.firstChild
        while (child) {
            //  appendChild: 向文档中插入一个dom元素，如果该元素已存在，则会被从原来的位置删除并且插入新的位置
            fragment.appendChild(child)
            child = el.firstChild
        }
        return fragment
    }
    scan(el) {
        for (var i = 0; i < el.children.length; i++) {
            var node = el.children[i];
            if (node.getAttribute("data-list")) {
                this.parseList(node);
            } else {
                this.parseModel(node);
            }
            if (node.children.length) {
                this.scan(node);
            }
        }
    }
    parseData(key, item) {
        var arr = key.split(".")
        if ((arr.length > 1) && item) {
            return item[arr[1]];
        }
        var v = this.$data[key]
        return v || "";
    }
    parseModel(node, item) {
        var text = node.innerHTML;
        var reg = /\{\{(.+?)\}\}/g;
        var arr = text.match(reg);
        if (!Array.isArray(arr)) {
            return false;
        }
        for (var i = 0; i < arr.length; i++) {
            var key = arr[i].replace(/{{/, "").replace(/}}/, "");
            var v = this.parseData(key, item);
            var r = new RegExp(arr[i]);
            text = text.replace(r, v);
        }
        node.innerHTML = text;
    }
    parseList(node) {
        var arr = node.getAttribute("data-list").split("in");
        if (arr.length < 2) {
            return false;
        }
        var itemName = arr[0].trim();
        var listName = arr[1].trim();
        var list = this.parseData(listName);
        if (!Array.isArray(list)) {
            return false;
        }
        var child = node.children[0];
        list.forEach((item, index) => {
            const copyItem = child.cloneNode(true);
            this.parseModel(copyItem, item);
            node.insertBefore(copyItem, child);
        })
        node.removeChild(child);
    }
}