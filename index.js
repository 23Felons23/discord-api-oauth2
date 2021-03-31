const axios = require('axios');

class DiscordOauth2 {

    constructor ( params ) {
        this.client_id = params.client_id;
        this.client_secret = params.client_secret;
        this.scope = params.scope;
        this.redirect_uri = params.redirect_uri;

        //Check if arguments are valid
        if(!this.client_id) return Error('Please provide a client_id !');
        if(!this.client_secret) return Error('Please provide a client_secret !');
        if(!this.scope || !Array.isArray(this.scope) || !this.scope.length > 0) return Error('Please provide at least one Oauth2 scope ! (The scope parameter needs to be an array.)');
        if(!this.redirect_uri) return Error('Please provide a redirect_uri !');

        this.scope = this.scope.join("%20");
        this.redirect_uri = encodeURIComponent(this.redirect_uri);
    };

    discordAuthorizePageURL () {
        return `https://discordapp.com/api/oauth2/authorize?client_id=${this.client_id}&redirect_uri=${this.redirect_uri}&response_type=code&scope=${this.scope}`;
    };

    async exchangeCodeForToken ( code ) {
        return await axios.post(
            'https://discordapp.com/api/oauth2/token',
            `code=${code}&grant_type=authorization_code&client_id=${this.client_id}&client_secret=${this.client_secret}&redirect_uri=${this.redirect_uri}&scope=${this.scope}`,
            {
                headers:{
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then(
                async res => {
                    return await res.data;
                }, error => {
                    if (error.response.status.toString()){
                        return `${error.response.status}: ${error.response.message}`;
                    }
                }
            );
    };

    async refreshToken  ( refreshToken ) {
        return await axios.post(
            'https://discordapp.com/api/oauth2/token',
            `refresh_token=${refreshToken}&grant_type=refresh_token&client_id=${this.client_id}&client_secret=${this.client_secret}&redirect_uri=${this.redirect_uri}&scope=${this.scope}`,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }).then(
                async res => {
                    return await res.data;
                }, error => {
                    if (error.response.status.toString()){
                        return `${error.response.status}: ${error.response.message}`;
                    }
                }
            );
    };

    async apiCall ({access_token, refresh_token, url, bot_token, refreshed}) {
        if(!access_token || typeof access_token !== "string") return Error('Please provide a access_token ! (string)');
        if(!refresh_token || typeof refresh_token !== "string") return Error('Please provide a refresh token ! (string)');
        if(!url || typeof url !== "string") return Error('Please provide a api url ! (string)');

        return await axios.get(
            url,
            {
                headers: {
                    "Authorization": bot_token ? `Bot ${bot_token}` : `Bearer ${access_token}`
                }
            }).then(
                async res => {
                    return Object.assign(
                        {   access_token,
                            refresh_token,
                            refreshed
                        }, res.data
                    );

                }, async error => {
                    if (error.response.status.toString() === "401") {
                        const data = await this.refreshToken( refresh_token );
                        await this.apiCall( { access_token: data.access_token, refresh_token: data.refresh_token, url: url, bot: bot , refreshed: true } );
                    }

                    if(error.response.status.toString() === "404") return { error: error.response.data, code: error.response.status.toString() };
                }
            );
    };

    async guildMemberHasRole ( { access_token, refresh_token, bot_token, guild_id, member_id , role_id } ) {
        if(!guild_id || typeof guild_id !== "string") return Error('You need to provide a guild id ! (STRING)');
        if(!member_id || typeof member_id !== "string") return Error('You need to provide a member id ! (STRING)');

        return await this.apiCall({ access_token: access_token, refresh_token: refresh_token, url: `https://discordapp.com/api/guilds/${guild_id}/members/${member_id}`, bot_token: bot_token})
            .then(
                async res => {
                    let hasRole = false;
                    if(!res.code){
                        res.roles.forEach( role => {
                            if(role === role_id) {
                                hasRole = true;
                            };
                        });
                    };
                    return hasRole;
                }
            );
    };
}

module.exports = DiscordOauth2;

