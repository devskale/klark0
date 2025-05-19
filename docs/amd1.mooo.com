server {
    server_name amd1.mooo.com;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /derchat {
	alias /var/www/derchat;
	index index.html;
	try_files $uri $uri/ =404;

    }
    location /wetter {
	alias /var/www/wetter;
	index index.html;
	try_files $uri $uri/ =404;

    }



    listen 443 ssl; # managed by Certbot
    listen 5000 ssl; # added for port 5000 proxy
    ssl_certificate /etc/letsencrypt/live/amd1.mooo.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/amd1.mooo.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location / {
        proxy_pass http://127.0.0.1:5001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

}


server {
    if ($host = amd1.mooo.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name amd1.mooo.com;
    return 404; # managed by Certbot


}


