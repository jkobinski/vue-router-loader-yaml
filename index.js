const yaml = require('js-yaml');

const evalName = function (keys,Name) {
    if(keys.indexOf(Name) == -1){
        keys.push(Name);
        return Name;
    }else{
        var index = 1;
        while(keys.indexOf(Name+'$'+index) > -1){
            index ++;
        }
        keys.push(Name+'$'+index);
        return Name+'$'+index;
    }
};

const evalRouter = function (json,Lazy,keys) {
    keys = keys||[];
    var result = {header:'',body:''};
    Object.keys(json).forEach((item) => {
        var componentName = item,
            obj = json[item],
            lazy = Lazy,
            chunkName = Lazy,
            component = obj.component,
            path = obj.path;
            name = obj.name;
            beforeEnter = obj.beforeEnter;
        componentName = evalName(keys,componentName);
        components = obj.components;
        if (obj.lazy != undefined ) {
            lazy = obj.lazy;
            chunkName = obj.lazy;
        }

        if (obj.children) {
            children = evalRouter(obj.children,lazy,keys);
            result.header += children.header;
            result.body += `\n{\n    path: '${path}',\n${obj.meta != undefined ? 'meta:'+JSON.stringify(obj.meta)+',' : ''}\n${obj.name != undefined ? 'name:'+JSON.stringify(obj.name)+',' :''}\n${obj.beforeEnter != undefined ? 'beforeEnter:'+JSON.stringify(obj.beforeEnter)+',' :''}\n    component: ${componentName},\n    children:[${children.body}]},`;
            result = setLazy(lazy,result,componentName, component, chunkName);
        } else {
            if (obj.components) {
                var components = `\n{\n  default: ${componentName}`;
                Object.keys(obj.components).forEach((name) => {
                    if(name === 'default') {
                        result = setLazy(lazy, result, componentName, obj.components[name], chunkName);
                        return;
                    }
                    components += `,\n  ${obj.components[name].name}: ${name}`;
                    result = setLazy(lazy, result, name, obj.components[name].component, chunkName);
                });
                components += '\n}';
                result.body += `\n{\n    path: '${path}',\n${obj.meta != undefined ? 'meta:'+JSON.stringify(obj.meta)+',' : ''}\n${obj.name != undefined ? 'name:'+JSON.stringify(obj.name)+',' :''}\n${obj.beforeEnter != undefined ? 'beforeEnter:'+JSON.stringify(obj.beforeEnter)+',' :''}\n    components: ${components}\n},`; 
            } else {
                result.body += `\n{\n    path: '${path}',\n${obj.meta != undefined ? 'meta:'+JSON.stringify(obj.meta)+',' : ''}\n${obj.name != undefined ? 'name:'+JSON.stringify(obj.name)+',' :''}\n${obj.beforeEnter != undefined ? 'beforeEnter:'+JSON.stringify(obj.beforeEnter)+',' :''}\n    component: ${componentName}\n},`;
                result = setLazy(lazy,result,componentName, component, chunkName);
            } 
        }
    });
    result.body = result.body.replace(/,$/gi,'');
    return result;
}

const setLazy = function (lazy,result,componentName, component, chunkName) {
    if (!lazy) {
        if(result.header.indexOf(`import ${componentName} from `) == -1) {
            result.header += `\nimport ${componentName} from '${component}';`;
        }
    } else {
        if (result.header.indexOf(`const ${componentName} = `) == -1) {
            result.header += `\nconst ${componentName} = r=>require.ensure([],()=>r(require('${component}')),'${chunkName}');`;
        }
    }
    return result;
}

module.exports = function(source) {
    this.cacheable && this.cacheable();
    var res = yaml.safeLoad(source);
    var result = evalRouter(res);
    return `
${result.header}

export default [${result.body}];

`
};
